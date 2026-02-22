const pool = require('../db');
const { InsufficientFundsError, DailyLimitExceededError, NotFoundError } = require('../utils/errors');

async function credit({ agentId, amount, serviceId, reference, memo, idempotencyKey, metadata }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency check
    if (idempotencyKey) {
      const { rows: existing } = await client.query(
        'SELECT * FROM transactions WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.length > 0) {
        await client.query('COMMIT');
        return existing[0];
      }
    }

    // Daily limit check
    if (serviceId) {
      const { rows: [svc] } = await client.query(
        'SELECT daily_credit_limit FROM services WHERE id = $1',
        [serviceId]
      );
      const today = new Date().toISOString().slice(0, 10);
      const { rows: [daily] } = await client.query(
        'SELECT total_credited FROM service_daily_credits WHERE service_id = $1 AND reference_date = $2',
        [serviceId, today]
      );
      const currentTotal = daily ? Number(daily.total_credited) : 0;
      if (currentTotal + amount > Number(svc.daily_credit_limit)) {
        throw new DailyLimitExceededError();
      }
    }

    // Update balance
    const { rows: [agent] } = await client.query(
      'UPDATE agents SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance',
      [amount, agentId]
    );
    if (!agent) throw new NotFoundError('Agent not found');

    // Insert transaction
    const { rows: [tx] } = await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_after, service_id, reference, memo, idempotency_key, metadata)
       VALUES ($1, 'credit', $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [agentId, amount, agent.balance, serviceId, reference, memo, idempotencyKey, metadata || {}]
    );

    // Upsert daily credits
    if (serviceId) {
      const today = new Date().toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO service_daily_credits (service_id, reference_date, total_credited, tx_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (service_id, reference_date)
         DO UPDATE SET total_credited = service_daily_credits.total_credited + $3,
                       tx_count = service_daily_credits.tx_count + 1`,
        [serviceId, today, amount]
      );
    }

    await client.query('COMMIT');
    return tx;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function debit({ agentId, amount, serviceId, reference, memo, idempotencyKey, metadata }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (idempotencyKey) {
      const { rows: existing } = await client.query(
        'SELECT * FROM transactions WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.length > 0) {
        await client.query('COMMIT');
        return existing[0];
      }
    }

    const { rows: [agent] } = await client.query(
      'UPDATE agents SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND balance >= $1 RETURNING balance',
      [amount, agentId]
    );
    if (!agent) throw new InsufficientFundsError();

    const { rows: [tx] } = await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_after, service_id, reference, memo, idempotency_key, metadata)
       VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [agentId, amount, agent.balance, serviceId, reference, memo, idempotencyKey, metadata || {}]
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

async function transfer({ senderId, receiverId, amount, memo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock agents in id order to prevent deadlocks
    const [first, second] = senderId < receiverId
      ? [senderId, receiverId]
      : [receiverId, senderId];

    await client.query('SELECT id FROM agents WHERE id = $1 FOR UPDATE', [first]);
    await client.query('SELECT id FROM agents WHERE id = $1 FOR UPDATE', [second]);

    // Debit sender
    const { rows: [sender] } = await client.query(
      'UPDATE agents SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND balance >= $1 RETURNING balance',
      [amount, senderId]
    );
    if (!sender) throw new InsufficientFundsError();

    // Credit receiver
    const { rows: [receiver] } = await client.query(
      'UPDATE agents SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance',
      [amount, receiverId]
    );
    if (!receiver) throw new NotFoundError('Receiver not found');

    // Insert both transaction records
    const { rows: [txOut] } = await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_after, counterparty_id, memo)
       VALUES ($1, 'transfer_out', $2, $3, $4, $5)
       RETURNING *`,
      [senderId, amount, sender.balance, receiverId, memo]
    );

    await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_after, counterparty_id, memo)
       VALUES ($1, 'transfer_in', $2, $3, $4, $5)`,
      [receiverId, amount, receiver.balance, senderId, memo]
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

module.exports = { credit, debit, transfer };
