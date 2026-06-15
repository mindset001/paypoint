const crypto = require('crypto');
const redis = require('../config/redis');

const OTP_TTL = 600; // 10 minutes

const generate = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const save = async (key, otp) => {
  await redis.set(`otp:${key}`, otp, 'EX', OTP_TTL);
};

const verify = async (key, otp) => {
  const stored = await redis.get(`otp:${key}`);
  if (!stored || stored !== otp) return false;
  await redis.del(`otp:${key}`);
  return true;
};

const generateRef = () => {
  return `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

module.exports = { generate, save, verify, generateRef };
