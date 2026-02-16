/**
 * Global error handler middleware
 * Converts all errors to consistent JSON responses
 */
export function errorHandler(err, req, res, next) {
  console.error('API Error:', {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
  });

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

/**
 * Async route wrapper to handle errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
