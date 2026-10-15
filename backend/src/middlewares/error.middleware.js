const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../config/logger');

/**
 * Single place where every error in the app becomes an HTTP response.
 * Normalizes Mongoose/Mongo errors into ApiError shapes so the client
 * always receives the same { success, message, data, meta } envelope,
 * and never a raw stack trace or driver error.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      // Mongoose schema validation failure
      const details = Object.values(error.errors).map((e) => e.message);
      error = ApiError.badRequest('Validation failed', details);
    } else if (error.code === 11000) {
      // Duplicate key - most notably the doctor+slotStart unique index
      // that guarantees no double-booking under concurrent requests.
      const field = Object.keys(error.keyValue || {}).join(', ');
      error = ApiError.conflict(
        field.includes('slotStart')
          ? 'This slot was just booked by someone else. Please choose another slot.'
          : `Duplicate value for field(s): ${field}`
      );
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest(`Invalid value for field: ${error.path}`);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Invalid or expired token');
    } else {
      // Unexpected/programmer error - log full detail server-side, but
      // never leak internals (stack traces, driver messages) to the client.
      logger.error(err.stack || err.message);
      error = ApiError.internal('Something went wrong. Please try again later.');
    }
  }

  // 5xx responses are always logged server-side (4xx are expected client
  // errors and don't warrant a log entry on every request).
  if (error.statusCode >= 500) logger.error(err.stack || err.message);

  return new ApiResponse(error.statusCode, error.message, null, error.details ? { details: error.details } : null).send(res);
}

module.exports = errorHandler;
