const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const otp = require('../../utils/otp');
const jwt = require('../../utils/jwt');
const redis = require('../../config/redis');
const crypto = require('crypto');

const generateReferralCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const register = async ({ firstName, lastName, email, phone, password, referralCode }) => {
  const existing = await User.findOne({
    $or: [{ 'email.address': email.toLowerCase() }, { 'phone.number': phone }],
  });
  if (existing) {
    const field = existing.email.address === email.toLowerCase() ? 'email' : 'phone number';
    throw Object.assign(new Error(`${field} already registered`), { statusCode: 409 });
  }

  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) referredBy = referrer._id;
  }

  const passwordHash = await User.hashPassword(password);

  let code;
  do {
    code = generateReferralCode();
  } while (await User.findOne({ referralCode: code }));

  const user = await User.create({
    firstName,
    lastName,
    email: { address: email.toLowerCase() },
    phone: { number: phone },
    passwordHash,
    referralCode: code,
    referredBy,
  });

  await Wallet.create({ userId: user._id });

  const otpCode = otp.generate();
  await otp.save(`phone:${phone}`, otpCode);

  console.log(`[OTP] ${phone}: ${otpCode}`);

  return {
    userId: user._id,
    message: 'OTP sent to your phone number',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otpCode }),
  };
};

const verifyOtp = async ({ identifier, otpCode }) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const key = isPhone ? `phone:${identifier}` : `email:${identifier}`;

  const valid = await otp.verify(key, otpCode);
  if (!valid) throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });

  const query = isPhone
    ? { 'phone.number': identifier }
    : { 'email.address': identifier.toLowerCase() };

  const user = await User.findOne(query);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (isPhone) {
    user.phone.verified = true;
    user.phone.verifiedAt = new Date();
  } else {
    user.email.verified = true;
    user.email.verifiedAt = new Date();
  }
  await user.save();

  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
};

const login = async ({ identifier, password, ip }) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone
    ? { 'phone.number': identifier }
    : { 'email.address': identifier.toLowerCase() };

  const user = await User.findOne(query).select('+passwordHash');
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const match = await user.comparePassword(password);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  if (user.status === 'suspended') {
    throw Object.assign(new Error('Account suspended. Contact support.'), { statusCode: 403 });
  }

  user.lastLoginAt = new Date();
  user.lastLoginIp = ip;
  await user.save();

  const tokens = issueTokens(user);
  await redis.set(`refresh:${user._id}`, tokens.refreshToken, 'EX', 7 * 24 * 3600);

  return { user: sanitize(user), ...tokens };
};

const refreshTokens = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  const stored = await redis.get(`refresh:${payload.userId}`);
  if (stored !== refreshToken) {
    throw Object.assign(new Error('Refresh token revoked'), { statusCode: 401 });
  }

  const user = await User.findById(payload.userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 401 });

  const tokens = issueTokens(user);
  await redis.set(`refresh:${user._id}`, tokens.refreshToken, 'EX', 7 * 24 * 3600);
  return tokens;
};

const setPin = async (userId, pin) => {
  const pinHash = await User.hashPin(pin);
  await User.findByIdAndUpdate(userId, { pinHash });
  return { message: 'Transaction PIN set successfully' };
};

const logout = async (userId) => {
  await redis.del(`refresh:${userId}`);
  return { message: 'Logged out successfully' };
};

const resendOtp = async (identifier) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const key = isPhone ? `phone:${identifier}` : `email:${identifier}`;
  const code = otp.generate();
  await otp.save(key, code);
  console.log(`[OTP] ${identifier}: ${code}`);
  return {
    message: 'OTP resent',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const issueTokens = (user) => {
  const payload = { userId: user._id.toString(), role: user.role };
  return {
    accessToken: jwt.generateAccessToken(payload),
    refreshToken: jwt.generateRefreshToken(payload),
  };
};

const sanitize = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  referralCode: user.referralCode,
});

const forgotPassword = async (identifier) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone ? { 'phone.number': identifier } : { 'email.address': identifier.toLowerCase() };
  const user = await User.findOne(query);
  if (!user) throw Object.assign(new Error('No account found with that identifier'), { statusCode: 404 });

  const code = otp.generate();
  await otp.save(`reset:${identifier}`, code);
  console.log(`[RESET OTP] ${identifier}: ${code}`);
  return {
    message: 'Reset code sent',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const resetPassword = async (identifier, otpCode, newPassword) => {
  const valid = await otp.verify(`reset:${identifier}`, otpCode);
  if (!valid) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 400 });

  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone ? { 'phone.number': identifier } : { 'email.address': identifier.toLowerCase() };
  const user = await User.findOne(query);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return { message: 'Password reset successfully' };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const match = await user.comparePassword(currentPassword);
  if (!match) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return { message: 'Password changed successfully' };
};

const changePin = async (userId, currentPin, newPin) => {
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (user.pinHash) {
    const match = await user.comparePin(currentPin);
    if (!match) throw Object.assign(new Error('Current PIN is incorrect'), { statusCode: 400 });
  }

  user.pinHash = await User.hashPin(newPin);
  await user.save();
  return { message: 'PIN changed successfully' };
};

module.exports = { register, verifyOtp, login, refreshTokens, setPin, logout, resendOtp, forgotPassword, resetPassword, changePassword, changePin };
