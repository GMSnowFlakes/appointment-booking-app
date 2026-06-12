/**
 * CORS configuration for the Appointment Book API.
 *
 * In development, the Vite dev server proxies /api requests to the backend,
 * so CORS is not needed for same-origin requests. However, allow localhost
 * origins for direct API access (e.g., testing with curl, Postman, or a
 * mobile app).
 *
 * In production, restrict to specific origins configured via CORS_ORIGINS.
 */

const logger = require('./logger');

function getCorsOrigins() {
  const envOrigins = process.env.CORS_ORIGINS;

  if (envOrigins) {
    // Comma-separated list of allowed origins
    const origins = envOrigins.split(',').map(s => s.trim()).filter(Boolean);

    if (origins.length > 0) {
      logger.info({ origins }, 'CORS configured with allowed origins');
      return origins;
    }
  }

  // Default: allow common localhost ports for development
  const defaultOrigins = [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:4173',   // Vite preview
    'http://localhost:3001',   // Direct server access
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:3001',
  ];

  return defaultOrigins;
}

function createCorsOptions() {
  const allowedOrigins = getCorsOrigins();

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS: origin not allowed');
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    credentials: true,
    maxAge: 86400, // 24 hours — browser can cache preflight
  };
}

module.exports = { createCorsOptions, getCorsOrigins };
