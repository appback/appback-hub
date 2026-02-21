const userWalletService = require('../../services/userWalletService');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');

exports.balances = async (req, res, next) => {
  try {
    const balances = await userWalletService.getBalances(req.user.userId);
    res.json({ balances });
  } catch (err) {
    next(err);
  }
};

exports.history = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const currencyCode = req.query.currency || null;

    const { data, total } = await userWalletService.getHistory(
      req.user.userId,
      { currencyCode, page, limit, offset }
    );

    res.json(paginatedResponse(data, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};
