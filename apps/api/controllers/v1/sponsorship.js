const sponsorshipService = require('../../services/sponsorshipService');
const { parsePagination, paginatedResponse } = require('../../../../../packages/common/pagination');
const { ValidationError } = require('../../utils/errors');

exports.tiers = async (req, res, next) => {
  try {
    const tiers = await sponsorshipService.getTiers();
    res.json({ tiers });
  } catch (err) {
    next(err);
  }
};

exports.prepare = async (req, res, next) => {
  try {
    const { tier_id } = req.body;
    if (!tier_id) throw new ValidationError('tier_id is required');

    const result = await sponsorshipService.prepare(req.user.id, tier_id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.confirm = async (req, res, next) => {
  try {
    const { order_id, payment_key } = req.body;
    if (!order_id) throw new ValidationError('order_id is required');

    const result = await sponsorshipService.confirm(req.user.id, order_id, payment_key);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.myHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { data, total } = await sponsorshipService.getMyHistory(req.user.id, { limit, offset });
    res.json(paginatedResponse(data, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.publicSummary = async (req, res, next) => {
  try {
    const summary = await sponsorshipService.getPublicSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

exports.publicHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { data, total } = await sponsorshipService.getPublicHistory({ limit, offset });
    res.json(paginatedResponse(data, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.publicExpenses = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { data, total } = await sponsorshipService.getPublicExpenses({ limit, offset });
    res.json(paginatedResponse(data, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

exports.addExpense = async (req, res, next) => {
  try {
    const { category, amount, description, expense_date } = req.body;
    const expense = await sponsorshipService.addExpense({
      category,
      amount,
      description,
      expenseDate: expense_date
    });
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
};
