const pool = require('../../db');
const walletService = require('../../services/walletService');
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');

exports.balance = async (req, res) => {
  res.json({
    agent_id: req.agent.id,
    name: req.agent.name,
    balance: Number(req.agent.balance)
  });
};

exports.history = async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);

    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE agent_id = $1',
      [req.agent.id]
    );

    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.agent.id, limit, offset]
    );

    res.json(paginatedResponse(rows, parseInt(count), { page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.credit = async (req, res, next) => {
  try {
    const { agent_id, amount, reference, memo, idempotency_key, metadata } = req.body;
    if (!agent_id || !amount) throw new BadRequestError('agent_id and amount required');
    if (amount <= 0) throw new BadRequestError('amount must be positive');

    const tx = await walletService.credit({
      agentId: agent_id,
      amount,
      serviceId: req.service.id,
      reference,
      memo,
      idempotencyKey: idempotency_key,
      metadata
    });

    res.json({ transaction: tx });
  } catch (err) {
    next(err);
  }
};

exports.debit = async (req, res, next) => {
  try {
    const { agent_id, amount, reference, memo, idempotency_key, metadata } = req.body;
    if (!agent_id || !amount) throw new BadRequestError('agent_id and amount required');
    if (amount <= 0) throw new BadRequestError('amount must be positive');

    const tx = await walletService.debit({
      agentId: agent_id,
      amount,
      serviceId: req.service.id,
      reference,
      memo,
      idempotencyKey: idempotency_key,
      metadata
    });

    res.json({ transaction: tx });
  } catch (err) {
    next(err);
  }
};

exports.transfer = async (req, res, next) => {
  try {
    const { receiver_id, amount, memo } = req.body;
    if (!receiver_id || !amount) throw new BadRequestError('receiver_id and amount required');
    if (amount <= 0) throw new BadRequestError('amount must be positive');
    if (receiver_id === req.agent.id) throw new BadRequestError('Cannot transfer to self');

    // Verify receiver exists
    const { rows } = await pool.query('SELECT id FROM agents WHERE id = $1 AND is_active = true', [receiver_id]);
    if (rows.length === 0) throw new NotFoundError('Receiver agent not found');

    const tx = await walletService.transfer({
      senderId: req.agent.id,
      receiverId: receiver_id,
      amount,
      memo
    });

    res.json({ transaction: tx });
  } catch (err) {
    next(err);
  }
};
