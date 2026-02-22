const pool = require('../db');
const { hashToken } = require('../utils/token');
const { UnauthorizedError } = require('../utils/errors');

async function agentAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer aw_agent_')) {
      throw new UnauthorizedError('Missing or invalid agent token');
    }

    const token = header.slice(7);
    const hashed = hashToken(token);

    const { rows } = await pool.query(
      'SELECT id, name, balance, is_active, meta, external_ids FROM agents WHERE api_token = $1',
      [hashed]
    );

    if (rows.length === 0) {
      throw new UnauthorizedError('Invalid agent token');
    }

    if (!rows[0].is_active) {
      throw new UnauthorizedError('Agent is deactivated');
    }

    req.agent = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = agentAuth;
