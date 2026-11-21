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

// Same check as verify(), but doesn't delete the record — for callers whose
// post-verification step can itself fail (e.g. creating a User, where a
// uniqueness race against another pending registration is possible). Pair
// with consume() once that step actually succeeds; otherwise a failure
// after a valid code would burn the OTP and strand the user with no way to
// retry (every future attempt would see "invalid or expired", correctly
// but unhelpfully, since the record is already gone).
const peekAndValidate = async (key, code) => {
  const record = await Otp.findOne({ key, expiresAt: { $gt: new Date() } });
  if (!record || record.code !== code) return false;
  return record.payload ? { pending: record.payload } : true;
};

const consume = async (key) => {
  await Otp.deleteOne({ key });
};

// Reads a still-valid OTP's payload without consuming it — used by resendOtp
// so a pending registration survives a code refresh.
const peekPayload = async (key) => {
  const record = await Otp.findOne({ key, expiresAt: { $gt: new Date() } });
  return record?.payload;
};

const generateRef = () =>
  `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

module.exports = { generate, save, verify, peekAndValidate, consume, peekPayload, generateRef };
