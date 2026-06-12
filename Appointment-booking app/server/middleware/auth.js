const jwt = require('jsonwebtoken');
const { ApiError, sendError } = require('../errors');
const logger = require('../logger');

const JWT_SECRET = process.env.JWT_SECRET || 'appointment-booking-secret-key-dev';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, new ApiError(401, 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid or expired token used');
    return sendError(res, new ApiError(403, 'Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn({ userId: req.user?.id }, 'Non-admin user attempted admin route');
    return sendError(res, new ApiError(403, 'Admin access required'));
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, JWT_SECRET };
