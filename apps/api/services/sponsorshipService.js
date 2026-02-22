const pool = require('../db');
const { NotFoundError, ValidationError } = require('../utils/errors');
const userWalletService = require('./userWalletService');

async function getTiers() {
  const { rows } = await pool.query(
    'SELECT * FROM sponsorship_tiers WHERE is_active = true ORDER BY sort_order'
  );
  return rows;
}

async function prepare(userId, tierId) {
  const { rows: [tier] } = await pool.query(
    'SELECT * FROM sponsorship_tiers WHERE id = $1 AND is_active = true',
    [tierId]
  );
  if (!tier) throw new NotFoundError('Sponsorship tier not found');

  const { rows: [order] } = await pool.query(
    `INSERT INTO sponsorship_orders (user_id, amount, gem_reward, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, tier.amount, tier.gem_reward]
  );

  return { orderId: order.id, amount: order.amount, gem_reward: order.gem_reward };
}

async function confirm(userId, orderId, paymentKey) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      `SELECT * FROM sponsorship_orders
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       FOR UPDATE`,
      [orderId, userId]
    );
    if (!order) throw new NotFoundError('Pending order not found');

    // TODO: PG 연동 시 여기에서 PG 승인 API 호출 + amount 검증
    // const pgResult = await pgClient.confirm(paymentKey, order.amount);

    await client.query(
      `UPDATE sponsorship_orders
       SET status = 'rewarded', payment_key = $1, rewarded_at = NOW()
       WHERE id = $2`,
      [paymentKey || null, orderId]
    );

    await client.query('COMMIT');

    // Gem 지급 (별도 트랜잭션 — userWalletService 내부에서 관리)
    const tx = await userWalletService.credit({
      userId,
      currencyCode: 'gem',
      amount: order.gem_reward,
      reference: 'sponsorship',
      memo: `Sponsorship #${orderId}`,
      idempotencyKey: `spon_${orderId}`,
      metadata: { sponsorship_order_id: orderId }
    });

    return { order: { ...order, status: 'rewarded' }, transaction: tx };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMyHistory(userId, { limit, offset }) {
  const { rows: [{ count }] } = await pool.query(
    'SELECT COUNT(*) FROM sponsorship_orders WHERE user_id = $1',
    [userId]
  );

  const { rows } = await pool.query(
    `SELECT * FROM sponsorship_orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { data: rows, total: parseInt(count) };
}

async function getPublicSummary() {
  const { rows: [sponsored] } = await pool.query(
    "SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM sponsorship_orders WHERE status = 'rewarded'"
  );
  const { rows: [expenses] } = await pool.query(
    'SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM platform_expenses'
  );

  const totalSponsored = Number(sponsored.total);
  const totalExpenses = Number(expenses.total);

  return {
    totalSponsored,
    totalExpenses,
    remaining: totalSponsored - totalExpenses
  };
}

async function getPublicHistory({ limit, offset }) {
  const { rows: [{ count }] } = await pool.query(
    "SELECT COUNT(*) FROM sponsorship_orders WHERE status = 'rewarded'"
  );

  const { rows } = await pool.query(
    `SELECT so.amount, so.gem_reward, so.created_at,
            u.display_name
     FROM sponsorship_orders so
     JOIN users u ON u.id = so.user_id
     WHERE so.status = 'rewarded'
     ORDER BY so.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return { data: rows, total: parseInt(count) };
}

async function getPublicExpenses({ limit, offset }) {
  const { rows: [{ count }] } = await pool.query(
    'SELECT COUNT(*) FROM platform_expenses'
  );

  const { rows } = await pool.query(
    `SELECT category, amount, description, expense_date
     FROM platform_expenses
     ORDER BY expense_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return { data: rows, total: parseInt(count) };
}

async function addExpense({ category, amount, description, expenseDate }) {
  if (!category || !amount) throw new ValidationError('category and amount required');

  const { rows: [expense] } = await pool.query(
    `INSERT INTO platform_expenses (category, amount, description, expense_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [category, amount, description, expenseDate || new Date()]
  );

  return expense;
}

module.exports = {
  getTiers,
  prepare,
  confirm,
  getMyHistory,
  getPublicSummary,
  getPublicHistory,
  getPublicExpenses,
  addExpense
};
