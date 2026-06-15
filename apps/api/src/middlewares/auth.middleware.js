const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('+role +status');
    if (!user) return error(res, 'User not found', 401);
    if (user.status === 'suspended') return error(res, 'Account suspended', 403);
    req.user = user;
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return error(res, 'Access denied', 403);
  }
  next();
};

module.exports = { authenticate, authorize };
