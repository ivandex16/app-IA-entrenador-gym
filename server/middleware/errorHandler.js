/**
 * Central error handler – catches errors thrown or passed via next(err).
 * In development returns full stack; in production returns safe message.
 */
const errorHandler = (err, _req, res, _next) => {
  console.error('❌', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return res
      .status(409)
      .json({ message: `Duplicate value for: ${field}` });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
