const { error } = require('../utils/response');

const notFound = (req, res) => {
  return error(res, `Route ${req.originalUrl} not found`, 404);
};

const globalError = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return error(res, messages.join('. '), 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return error(res, `${field} already exists`, 409);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return error(res, message, statusCode);
};

module.exports = { notFound, globalError };
