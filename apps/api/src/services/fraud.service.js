const redis = require('../config/redis');
const Transaction = require('../models/Transaction');

const VELOCITY_LIMIT = 20;
const VELOCITY_WINDOW = 3600; // 1 hour
const DUPLICATE_WINDOW = 60;  // 60 seconds

const checkVelocity = async (userId) => {
  const key = `velocity:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, VELOCITY_WINDOW);
  if (count > VELOCITY_LIMIT) {
    throw Object.assign(
      new Error('Too many transactions. Please wait before trying again.'),
      { statusCode: 429 }
    );
  }
};

const checkDuplicate = async (userId, type, meta) => {
  const since = new Date(Date.now() - DUPLICATE_WINDOW * 1000);
  const query = { userId, type, status: { $in: ['pending', 'success'] }, createdAt: { $gte: since } };

  if (meta.phone) query['meta.phone'] = meta.phone;
  if (meta.amount) query.amount = meta.amount;

  const duplicate = await Transaction.findOne(query);
  if (duplicate) {
    throw Object.assign(
      new Error('Duplicate transaction detected. Please wait 60 seconds.'),
      { statusCode: 409 }
    );
  }
};

module.exports = { checkVelocity, checkDuplicate };
