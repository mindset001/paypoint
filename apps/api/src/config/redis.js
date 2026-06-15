const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null, // don't retry — fail fast and let callers handle it
  enableOfflineQueue: false,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.warn('Redis unavailable:', err.message));

module.exports = redis;
