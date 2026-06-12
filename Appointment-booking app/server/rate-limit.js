const rateLimit = require('express-rate-limit');
const { ApiError, ErrorCodes } = require('./errors');
const logger = require('./logger');

/**
 * Create a rate limiter with the given options and a standardized error response.
 */
function createLimiter({ windowMs, max, message, name }) {
  // Disable rate limiting when DISABLE_RATE_LIMIT is set (used for E2E tests)
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,   // Disable the `X-RateLimit-*` headers
    message: {
      error: message || 'Too many requests, please try again later',
      code: ErrorCodes.RATE_LIMITED,
    },
    handler: (req, res, next, options) => {
      logger.warn({
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        rateLimitName: name,
      }, 'Rate limit exceeded');

      res.status(options.statusCode).json(options.message);
    },

  });
}

// ─── Auth endpoints: strict limits ─────────────
// Login/register are prime targets for brute force attacks
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  name: 'auth',
});

// ─── Services & public endpoints ──────────────
// Public browsing, more lenient
const publicLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please slow down.',
  name: 'public',
});

// ─── Appointments (authenticated users) ───────
const appointmentsLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many appointment requests. Please try again later.',
  name: 'appointments',
});

// ─── Admin endpoints ──────────────────────────
const adminLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many admin requests. Please slow down.',
  name: 'admin',
});

// ─── Health check: very lenient ───────────────
const healthLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests.',
  name: 'health',
});

module.exports = {
  authLimiter,
  publicLimiter,
  appointmentsLimiter,
  adminLimiter,
  healthLimiter,
};
