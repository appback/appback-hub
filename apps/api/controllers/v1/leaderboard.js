const pool = require('../../db');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);

    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM agents WHERE is_active = true'
    );

    const { rows } = await pool.query(
      `SELECT id, name, balance, external_ids, created_at
       FROM agents WHERE is_active = true
       ORDER BY balance DESC, created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const ranked = rows.map((row, i) => ({
      rank: offset + i + 1,
      ...row,
      balance: Number(row.balance)
    }));

    res.json(paginatedResponse(ranked, parseInt(count), { page, limit }));
  } catch (err) {
    next(err);
  }
};
