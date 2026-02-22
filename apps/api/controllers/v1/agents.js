const pool = require('../../db');
const { generateAgentToken, hashToken } = require('../../utils/token');
const { BadRequestError, ConflictError } = require('../../utils/errors');

exports.register = async (req, res, next) => {
  try {
    const { name, meta, external_ids } = req.body;
    if (!name) throw new BadRequestError('Agent name is required');

    const rawToken = generateAgentToken();
    const hashed = hashToken(rawToken);

    const { rows } = await pool.query(
      `INSERT INTO agents (name, api_token, meta, external_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, balance, is_active, meta, external_ids, created_at`,
      [name, hashed, meta || {}, external_ids || {}]
    );

    res.status(201).json({
      agent: rows[0],
      api_token: rawToken
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(new ConflictError('Agent token conflict, please retry'));
    }
    next(err);
  }
};
