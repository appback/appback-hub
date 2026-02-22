const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../../utils/errors');
const bonusService = require('../../services/bonusService');

exports.register = async (req, res, next) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      throw new BadRequestError('Email and password required');
    }
    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters');
    }

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      throw new ConflictError('Email already registered');
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'player')
       RETURNING id, email, display_name, role, avatar_url, created_at`,
      [email, hash, display_name || null]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, displayName: user.display_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fire-and-forget signup bonus
    bonusService.grantSignupBonus(user.id);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError('Email and password required');
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = rows[0];
    if (!user.password_hash) {
      throw new UnauthorizedError('This account uses GitHub login. Please sign in with GitHub.');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, displayName: user.display_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        github_username: user.github_username
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, display_name, avatar_url, github_username, role, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    // Check daily visit bonus (non-blocking)
    const bonus = await bonusService.checkDailyVisitBonus(req.user.userId);

    res.json({ user: rows[0], bonus: bonus.granted ? { type: 'daily_visit', amount: bonus.amount, currency: bonus.currency } : null });
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      throw new BadRequestError('Token required');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      valid: true,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      displayName: payload.displayName
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.json({ valid: false });
    }
    next(err);
  }
};
