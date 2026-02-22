const pool = require('../db');
const { hashToken } = require('../utils/token');
const { UnauthorizedError } = require('../utils/errors');

async function serviceAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer aw_service_')) {
      throw new UnauthorizedError('Missing or invalid service key');
    }

    const token = header.slice(7);
    const hashed = hashToken(token);

    const { rows } = await pool.query(
      'SELECT id, name, is_active, daily_credit_limit, meta FROM services WHERE api_key = $1',
      [hashed]
    );

    if (rows.length === 0) {
      throw new UnauthorizedError('Invalid service key');
    }

    if (!rows[0].is_active) {
      throw new UnauthorizedError('Service is deactivated');
    }

    req.service = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = serviceAuth;
