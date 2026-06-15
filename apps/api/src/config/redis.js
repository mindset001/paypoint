const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.warn('Redis error:', err.message));

module.exports = redis;
