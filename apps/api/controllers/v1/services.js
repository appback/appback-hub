const pool = require('../../db');
const { generateServiceKey, hashToken } = require('../../utils/token');
const { BadRequestError, ConflictError } = require('../../utils/errors');

exports.create = async (req, res, next) => {
  try {
    const { name, description, daily_credit_limit, meta } = req.body;
    if (!name) throw new BadRequestError('Service name is required');

    const rawKey = generateServiceKey();
    const hashed = hashToken(rawKey);

    const { rows } = await pool.query(
      `INSERT INTO services (name, api_key, description, daily_credit_limit, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, is_active, daily_credit_limit, meta, created_at`,
      [name, hashed, description, daily_credit_limit || 1000000, meta || {}]
    );

    res.status(201).json({
      service: rows[0],
      api_key: rawKey
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(new ConflictError('Service name already exists'));
    }
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, is_active, daily_credit_limit, meta, created_at FROM services ORDER BY created_at DESC'
    );
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
};
