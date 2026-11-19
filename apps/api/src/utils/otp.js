const crypto = require('crypto');
const Otp = require('../models/Otp');

const OTP_TTL_SECONDS = 600; // 10 minutes

const generate = () => Math.floor(100000 + Math.random() * 900000).toString();

const save = async (key, code, payload) => {
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  await Otp.findOneAndUpdate(
    { key },
    { key, code, expiresAt, payload },
    { upsert: true, new: true }
  );
};

// Returns `false` if invalid/expired, `true` if valid with no payload,
// or `{ pending: payload }` if valid and carrying a pending-registration payload.
const verify = async (key, code) => {
  const record = await Otp.findOne({ key, expiresAt: { $gt: new Date() } });
  if (!record || record.code !== code) return false;
  await Otp.deleteOne({ key });
  return record.payload ? { pending: record.payload } : true;
};

// Reads a still-valid OTP's payload without consuming it — used by resendOtp
// so a pending registration survives a code refresh.
const peekPayload = async (key) => {
  const record = await Otp.findOne({ key, expiresAt: { $gt: new Date() } });
  return record?.payload;
};

const generateRef = () =>
  `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

module.exports = { generate, save, verify, peekPayload, generateRef };
