const pool = require('../db');
const { InsufficientFundsError, NotFoundError } = require('../utils/errors');

async function getBalances(userId) {
  const { rows } = await pool.query(
    `SELECT c.id AS currency_id, c.code, c.name, COALESCE(ub.balance, 0)::bigint AS balance
     FROM currencies c
     LEFT JOIN user_balances ub ON ub.currency_id = c.id AND ub.user_id = $1
     WHERE c.is_active = true
     ORDER BY c.id`,
    [userId]
  );
  return rows;
}

async function credit({ userId, currencyCode, amount, reference, memo, idempotencyKey, metadata }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (idempotencyKey) {
      const { rows: existing } = await client.query(
        'SELECT * FROM user_transactions WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.length > 0) {
        await client.query('COMMIT');
        return existing[0];
      }
    }

    const { rows: [currency] } = await client.query(
      'SELECT id FROM currencies WHERE code = $1 AND is_active = true',
      [currencyCode]
    );
    if (!currency) throw new NotFoundError(`Currency not found: ${currencyCode}`);

    // UPSERT balance
    const { rows: [bal] } = await client.query(
      `INSERT INTO user_balances (user_id, currency_id, balance, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, currency_id)
       DO UPDATE SET balance = user_balances.balance + $3, updated_at = NOW()
       RETURNING balance`,
      [userId, currency.id, amount]
    );

    const { rows: [tx] } = await client.query(
      `INSERT INTO user_transactions (user_id, currency_id, type, amount, balance_after, reference, memo, idempotency_key, metadata)
       VALUES ($1, $2, 'credit', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, currency.id, amount, bal.balance, reference, memo, idempotencyKey, metadata || {}]
    );

    await client.query('COMMIT');
    return tx;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function debit({ userId, currencyCode, amount, reference, memo, idempotencyKey, metadata }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (idempotencyKey) {
      const { rows: existing } = await client.query(
        'SELECT * FROM user_transactions WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.length > 0) {
        await client.query('COMMIT');
        return existing[0];
      }
    }

    const { rows: [currency] } = await client.query(
      'SELECT id FROM currencies WHERE code = $1 AND is_active = true',
      [currencyCode]
    );
    if (!currency) throw new NotFoundError(`Currency not found: ${currencyCode}`);

    const { rows: [bal] } = await client.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND currency_id = $3 AND balance >= $1
       RETURNING balance`,
      [amount, userId, currency.id]
    );
    if (!bal) throw new InsufficientFundsError();

    const { rows: [tx] } = await client.query(
      `INSERT INTO user_transactions (user_id, currency_id, type, amount, balance_after, reference, memo, idempotency_key, metadata)
       VALUES ($1, $2, 'debit', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, currency.id, amount, bal.balance, reference, memo, idempotencyKey, metadata || {}]
    );

    await client.query('COMMIT');
    return tx;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function transfer({ senderId, receiverId, currencyCode, amount, memo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [currency] } = await client.query(
      'SELECT id FROM currencies WHERE code = $1 AND is_active = true',
      [currencyCode]
    );
    if (!currency) throw new NotFoundError(`Currency not found: ${currencyCode}`);

    // Lock in id order to prevent deadlocks
    const [first, second] = senderId < receiverId
      ? [senderId, receiverId]
      : [receiverId, senderId];
    await client.query(
      'SELECT user_id FROM user_balances WHERE user_id = $1 AND currency_id = $2 FOR UPDATE',
      [first, currency.id]
    );
    await client.query(
      'SELECT user_id FROM user_balances WHERE user_id = $1 AND currency_id = $2 FOR UPDATE',
      [first === senderId ? receiverId : senderId, currency.id]
    );

    // Debit sender
    const { rows: [senderBal] } = await client.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND currency_id = $3 AND balance >= $1
       RETURNING balance`,
      [amount, senderId, currency.id]
    );
    if (!senderBal) throw new InsufficientFundsError();

    // Credit receiver (upsert)
    const { rows: [receiverBal] } = await client.query(
      `INSERT INTO user_balances (user_id, currency_id, balance, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, currency_id)
       DO UPDATE SET balance = user_balances.balance + $3, updated_at = NOW()
       RETURNING balance`,
      [receiverId, currency.id, amount]
    );

    const { rows: [txOut] } = await client.query(
      `INSERT INTO user_transactions (user_id, currency_id, type, amount, balance_after, counterparty_id, memo)
       VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6)
       RETURNING *`,
      [senderId, currency.id, amount, senderBal.balance, receiverId, memo]
    );

    await client.query(
      `INSERT INTO user_transactions (user_id, currency_id, type, amount, balance_after, counterparty_id, memo)
       VALUES ($1, $2, 'transfer_in', $3, $4, $5, $6)`,
      [receiverId, currency.id, amount, receiverBal.balance, senderId, memo]
    );

    await client.query('COMMIT');
    return txOut;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistory(userId, { currencyCode, page, limit, offset }) {
  let currencyFilter = '';
  const params = [userId];

  if (currencyCode) {
    params.push(currencyCode);
    currencyFilter = ` AND c.code = $${params.length}`;
  }

  const countSql = `
    SELECT COUNT(*) FROM user_transactions ut
    JOIN currencies c ON c.id = ut.currency_id
    WHERE ut.user_id = $1${currencyFilter}`;
  const { rows: [{ count }] } = await pool.query(countSql, params);

  const dataSql = `
    SELECT ut.*, c.code AS currency_code, c.name AS currency_name
    FROM user_transactions ut
    JOIN currencies c ON c.id = ut.currency_id
    WHERE ut.user_id = $1${currencyFilter}
    ORDER BY ut.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const { rows } = await pool.query(dataSql, [...params, limit, offset]);

  return { data: rows, total: parseInt(count) };
}

module.exports = { getBalances, credit, debit, transfer, getHistory };
