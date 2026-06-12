/**
 * Standardized error codes for the API
 */
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * ApiError class for structured error handling
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {string} [code] - Machine-readable error code (defaults from status)
   * @param {object} [details] - Additional error details (validation errors, etc.)
   */
  constructor(statusCode, message, code, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || getDefaultCode(statusCode);
    this.details = details || null;
  }
}

/**
 * Map HTTP status codes to default error codes
 */
function getDefaultCode(statusCode) {
  const map = {
    400: ErrorCodes.VALIDATION_ERROR,
    401: ErrorCodes.UNAUTHORIZED,
    403: ErrorCodes.FORBIDDEN,
    404: ErrorCodes.NOT_FOUND,
    409: ErrorCodes.CONFLICT,
    429: ErrorCodes.RATE_LIMITED,
    500: ErrorCodes.INTERNAL_ERROR,
    503: ErrorCodes.SERVICE_UNAVAILABLE,
  };
  return map[statusCode] || ErrorCodes.INTERNAL_ERROR;
}

/**
 * Send a standardized error response
 *
 * @param {object} res - Express response object
 * @param {ApiError|object} error - Error instance or { status, message, code, details }
 */
function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || getDefaultCode(statusCode);
  const details = error.details || null;

  res.status(statusCode).json({
    error: message,
    code,
    ...(details ? { details } : {}),
  });
}

/**
 * Convenience: create and send a validation error
 */
function sendValidationError(res, message, details) {
  sendError(res, new ApiError(400, message, ErrorCodes.VALIDATION_ERROR, details));
}

/**
 * Convenience: create and send a not-found error
 */
function sendNotFoundError(res, message) {
  sendError(res, new ApiError(404, message || 'Resource not found', ErrorCodes.NOT_FOUND));
}

/**
 * Convenience: create and send a conflict error
 */
function sendConflictError(res, message) {
  sendError(res, new ApiError(409, message || 'Resource already exists', ErrorCodes.CONFLICT));
}

/**
 * Convenience: create and send an internal error
 */
function sendInternalError(res, message) {
  sendError(res, new ApiError(500, message || 'Internal server error', ErrorCodes.INTERNAL_ERROR));
}

module.exports = {
  ApiError,
  ErrorCodes,
  sendError,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalError,
};
