const crypto = require('crypto');
const Otp = require('../models/Otp');

const OTP_TTL_SECONDS = 600; // 10 minutes

const generate = () => Math.floor(100000 + Math.random() * 900000).toString();

const save = async (key, code) => {
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  await Otp.findOneAndUpdate(
    { key },
    { key, code, expiresAt },
    { upsert: true, new: true }
  );
};

const verify = async (key, code) => {
  const record = await Otp.findOne({ key, expiresAt: { $gt: new Date() } });
  if (!record || record.code !== code) return false;
  await Otp.deleteOne({ key });
  return true;
};

const generateRef = () =>
  `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

module.exports = { generate, save, verify, generateRef };
