const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

function jwtAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication required'));
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

module.exports = jwtAuth;
