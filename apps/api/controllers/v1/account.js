const pool = require('../../db');
const { BadRequestError, NotFoundError, ConflictError } = require('../../utils/errors');

const VALID_SERVICES = ['titleclash', 'clawclash'];

exports.link = async (req, res, next) => {
  try {
    const { service, service_user_id } = req.body;
    if (!service || !service_user_id) {
      throw new BadRequestError('service and service_user_id required');
    }
    if (!VALID_SERVICES.includes(service)) {
      throw new BadRequestError(`Invalid service. Valid: ${VALID_SERVICES.join(', ')}`);
    }

    const { rows: [link] } = await pool.query(
      `INSERT INTO linked_accounts (user_id, service, service_user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.userId, service, service_user_id]
    );

    res.status(201).json({ link });
  } catch (err) {
    if (err.code === '23505') {
      return next(new ConflictError('Account already linked'));
    }
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, service, service_user_id, linked_at FROM linked_accounts WHERE user_id = $1 ORDER BY linked_at',
      [req.user.userId]
    );

    res.json({ links: rows });
  } catch (err) {
    next(err);
  }
};

exports.unlink = async (req, res, next) => {
  try {
    const { service } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM linked_accounts WHERE user_id = $1 AND service = $2',
      [req.user.userId, service]
    );

    if (rowCount === 0) {
      throw new NotFoundError('Linked account not found');
    }

    res.json({ message: 'Account unlinked' });
  } catch (err) {
    next(err);
  }
};
