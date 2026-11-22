const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const otp = require('../../utils/otp');
const jwt = require('../../utils/jwt');
const redis = require('../../config/redis');
const crypto = require('crypto');
const { phoneVariants } = require('../../utils/phone');
const referralService = require('../referral/referral.service');
const emailService = require('../../services/email.service');
const Dojah = require('../../providers/dojah/dojah.client');

const generateReferralCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// The OTP is always saved to the DB before this runs — a transient email-
// provider failure (e.g. a send-domain outage) shouldn't turn into a hard
// 500 that blocks registration/login/reset entirely. devOtp (non-prod) and
// a later resend both still work off the same saved record either way.
const sendOtpEmailSafely = async (to, code, opts) => {
  try {
    await emailService.sendOtpEmail(to, code, opts);
  } catch (err) {
    console.error(`Failed to send OTP email to ${to}:`, err.message);
  }
};

// Nothing is written to User/Wallet here — the account only gets created
// once the OTP is verified (see verifyOtp below), so an unconfirmed email
// never leaves an orphaned record behind.
const register = async ({ firstName, lastName, email, phone, password, referralCode }) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({
    $or: [{ 'email.address': normalizedEmail }, { 'phone.number': { $in: phoneVariants(phone) } }],
  });
  if (existing) {
    const field = existing.email.address === normalizedEmail ? 'email' : 'phone number';
    throw Object.assign(new Error(`${field} already registered`), { statusCode: 409 });
  }

  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) referredBy = referrer._id;
  }

  const passwordHash = await User.hashPassword(password);

  const otpCode = otp.generate();
  await otp.save(`email:${normalizedEmail}`, otpCode, {
    firstName,
    lastName,
    email: normalizedEmail,
    phone,
    passwordHash,
    referredBy,
    referralCode: referralCode || null,
  });

  console.log(`[OTP] ${normalizedEmail}: ${otpCode}`);
  await sendOtpEmailSafely(normalizedEmail, otpCode, { heading: 'Your verification code' });

  return {
    message: 'OTP sent to your email address. Verify it to finish creating your account.',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otpCode }),
  };
};

const verifyOtp = async ({ identifier, otpCode }) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const key = isPhone ? `phone:${identifier}` : `email:${identifier.toLowerCase()}`;

  // Doesn't delete the OTP yet — the account-creation step below can
  // legitimately fail (see the race check), and burning the code on a
  // failed attempt would strand the user: every retry with the same
  // (correct) code would then see "invalid or expired" forever, since the
  // record would already be gone. Only consumed once everything succeeds.
  const result = await otp.peekAndValidate(key, otpCode);
  if (!result) throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });

  let user;
  if (result.pending) {
    // First time this identifier is verified — the account didn't exist
    // until now; create it from the payload stashed at register() time.
    const payload = result.pending;

    // register()'s own duplicate check only looks at already-created
    // Users — it can't see another pending (unverified) registration that
    // reserved the same phone/email. Two people (or one person retrying
    // with a reused test phone) can both pass that check and each hold a
    // valid OTP for the same phone number; whichever verifies first wins,
    // so re-check right before creating instead of letting User.create()
    // throw a raw duplicate-key error after the OTP's already consumed.
    const conflict = await User.findOne({
      $or: [{ 'email.address': payload.email }, { 'phone.number': { $in: phoneVariants(payload.phone) } }],
    });
    if (conflict) {
      const field = conflict.email.address === payload.email ? 'Email' : 'Phone number';
      throw Object.assign(new Error(`${field} was registered by someone else while this code was pending — please sign up again`), { statusCode: 409 });
    }

    let code;
    do {
      code = generateReferralCode();
    } while (await User.findOne({ referralCode: code }));

    user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: { address: payload.email, verified: true, verifiedAt: new Date() },
      phone: { number: payload.phone },
      passwordHash: payload.passwordHash,
      referralCode: code,
      referredBy: payload.referredBy,
    });

    await Wallet.create({ userId: user._id });

    if (payload.referredBy) {
      await referralService.createPendingReferral(payload.referredBy, user._id, payload.referralCode);
      // Best-effort — a failure here shouldn't block account creation
      // itself, which has already succeeded by this point.
      try {
        await referralService.creditSignupBonus(user._id);
      } catch (err) {
        console.error(`Failed to credit signup bonus for user ${user._id}:`, err.message);
      }
    }

    await otp.consume(key);
  } else {
    // Existing, already-created account verifying phone/email after the fact.
    const query = isPhone
      ? { 'phone.number': { $in: phoneVariants(identifier) } }
      : { 'email.address': identifier.toLowerCase() };

    user = await User.findOne(query);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    if (isPhone) {
      user.phone.verified = true;
      user.phone.verifiedAt = new Date();
    } else {
      user.email.verified = true;
      user.email.verifiedAt = new Date();
    }
    await user.save();
    await otp.consume(key);
  }

  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
};

const login = async ({ identifier, password, ip }) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone
    ? { 'phone.number': { $in: phoneVariants(identifier) } }
    : { 'email.address': identifier.toLowerCase() };

  const user = await User.findOne(query).select('+passwordHash');
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const match = await user.comparePassword(password);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  if (user.status === 'suspended') {
    throw Object.assign(new Error('Account suspended. Contact support.'), { statusCode: 403 });
  }

  if (!user.email.verified) {
    // The frontend redirects unverified logins straight to the OTP screen,
    // which assumes a code is already on its way — actually send one.
    const code = otp.generate();
    await otp.save(`email:${user.email.address}`, code);
    console.log(`[OTP] ${user.email.address}: ${code}`);
    await sendOtpEmailSafely(user.email.address, code, { heading: 'Your verification code' });
  }

  user.lastLoginAt = new Date();
  user.lastLoginIp = ip;
  await user.save();

  const tokens = issueTokens(user);
  try { await redis.set(`refresh:${user._id}`, tokens.refreshToken, 'EX', 7 * 24 * 3600); } catch {}

  return { user: sanitize(user), ...tokens };
};

const refreshTokens = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  try {
    const stored = await redis.get(`refresh:${payload.userId}`);
    if (stored !== null && stored !== refreshToken) {
      throw Object.assign(new Error('Refresh token revoked'), { statusCode: 401 });
    }
  } catch (err) {
    if (err.statusCode === 401) throw err;
  }

  const user = await User.findById(payload.userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 401 });

  const tokens = issueTokens(user);
  try { await redis.set(`refresh:${user._id}`, tokens.refreshToken, 'EX', 7 * 24 * 3600); } catch {}
  return tokens;
};

const setPin = async (userId, pin) => {
  const pinHash = await User.hashPin(pin);
  await User.findByIdAndUpdate(userId, { pinHash });
  return { message: 'Transaction PIN set successfully' };
};

const logout = async (userId) => {
  try { await redis.del(`refresh:${userId}`); } catch {}
  return { message: 'Logged out successfully' };
};

const resendOtp = async (identifier) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const key = isPhone ? `phone:${identifier}` : `email:${identifier.toLowerCase()}`;
  const pendingPayload = await otp.peekPayload(key);
  const code = otp.generate();
  await otp.save(key, code, pendingPayload);
  console.log(`[OTP] ${identifier}: ${code}`);
  if (!isPhone) await sendOtpEmailSafely(identifier, code, { heading: 'Your verification code' });
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
  kycSubmittedAt: user.kyc?.submittedAt ?? null,
});

const forgotPassword = async (identifier) => {
  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone ? { 'phone.number': { $in: phoneVariants(identifier) } } : { 'email.address': identifier.toLowerCase() };
  const user = await User.findOne(query);
  if (!user) throw Object.assign(new Error('No account found with that identifier'), { statusCode: 404 });

  const code = otp.generate();
  await otp.save(`reset:${identifier}`, code);
  console.log(`[RESET OTP] ${identifier}: ${code}`);
  if (!isPhone) await sendOtpEmailSafely(user.email.address, code, { heading: 'Your password reset code' });
  return {
    message: 'Reset code sent',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const resetPassword = async (identifier, otpCode, newPassword) => {
  const valid = await otp.verify(`reset:${identifier}`, otpCode);
  if (!valid) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 400 });

  const isPhone = /^\+?[0-9]{10,14}$/.test(identifier);
  const query = isPhone ? { 'phone.number': { $in: phoneVariants(identifier) } } : { 'email.address': identifier.toLowerCase() };
  const user = await User.findOne(query);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return { message: 'Password reset successfully' };
};

// Checks the current password, then emails an OTP instead of changing it
// outright — the change only actually happens in confirmChangePassword once
// that code comes back, so a stolen/active session alone can't silently
// swap the password.
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const match = await user.comparePassword(currentPassword);
  if (!match) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });

  const newPasswordHash = await User.hashPassword(newPassword);
  const code = otp.generate();
  await otp.save(`changepw:${userId}`, code, { newPasswordHash });
  console.log(`[CHANGE PASSWORD OTP] ${user.email.address}: ${code}`);
  await sendOtpEmailSafely(user.email.address, code, { heading: 'Confirm your password change' });
  return {
    message: 'Enter the code sent to your email to confirm the password change',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const confirmChangePassword = async (userId, otpCode) => {
  const result = await otp.verify(`changepw:${userId}`, otpCode);
  if (!result) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 400 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.passwordHash = result.pending.newPasswordHash;
  await user.save();
  return { message: 'Password changed successfully' };
};

// Same confirm-by-OTP pattern as changePassword above.
const changePin = async (userId, currentPin, newPin) => {
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (user.pinHash) {
    const match = await user.comparePin(currentPin);
    if (!match) throw Object.assign(new Error('Current PIN is incorrect'), { statusCode: 400 });
  }

  const newPinHash = await User.hashPin(newPin);
  const code = otp.generate();
  await otp.save(`changepin:${userId}`, code, { newPinHash });
  console.log(`[CHANGE PIN OTP] ${user.email.address}: ${code}`);
  await sendOtpEmailSafely(user.email.address, code, { heading: 'Confirm your PIN change' });
  return {
    message: 'Enter the code sent to your email to confirm the PIN change',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const confirmChangePin = async (userId, otpCode) => {
  const result = await otp.verify(`changepin:${userId}`, otpCode);
  if (!result) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 400 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.pinHash = result.pending.newPinHash;
  await user.save();
  return { message: 'PIN changed successfully' };
};

// Already-authenticated recovery path for a genuinely forgotten PIN —
// unlike changePin, doesn't need the old one, just proof of email access.
const forgotPin = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const code = otp.generate();
  await otp.save(`pinreset:${userId}`, code);
  console.log(`[PIN RESET OTP] ${user.email.address}: ${code}`);
  await sendOtpEmailSafely(user.email.address, code, { heading: 'Your PIN reset code' });
  return {
    message: 'A reset code has been sent to your email',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
  };
};

const resetPin = async (userId, otpCode, newPin) => {
  const valid = await otp.verify(`pinreset:${userId}`, otpCode);
  if (!valid) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 400 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.pinHash = await User.hashPin(newPin);
  await user.save();
  return { message: 'PIN reset successfully' };
};

const updateProfile = async (userId, { firstName, lastName }) => {
  const update = {};
  if (firstName) update.firstName = firstName.trim();
  if (lastName)  update.lastName  = lastName.trim();
  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return sanitize(user);
};

// Strips everything but letters before comparing — Nigerian name records
// often differ in spacing, hyphenation or case, not in substance.
const namesRoughlyMatch = (a, b) =>
  (a || '').toLowerCase().replace(/[^a-z]/g, '') === (b || '').toLowerCase().replace(/[^a-z]/g, '');

const submitKyc = async (userId, { nin, bvn, number }) => {
  if (!nin && !bvn && !number) throw Object.assign(new Error('Provide a NIN, BVN, or phone number'), { statusCode: 400 });
  if (nin && !/^\d{11}$/.test(nin)) throw Object.assign(new Error('NIN must be 11 digits'), { statusCode: 400 });
  if (bvn && !/^\d{11}$/.test(bvn)) throw Object.assign(new Error('BVN must be 11 digits'), { statusCode: 400 });
  if (number && !/^\+?[0-9]{10,14}$/.test(number)) throw Object.assign(new Error('Enter a valid phone number'), { statusCode: 400 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  // Phone-number verification has no automated lookup provider — it always
  // goes to the manual KYC review queue rather than through Dojah.
  if (number) {
    const updated = await User.findByIdAndUpdate(userId, {
      'kyc.submittedAt': new Date(),
      'kyc.phoneNumber': number,
      status: 'pending_kyc',
    }, { new: true });
    return {
      ...sanitize(updated),
      message: 'Submitted for manual review — we\'ll verify your number within 24 hours.',
    };
  }

  let entity;
  try {
    const result = nin ? await Dojah.lookupNin(nin) : await Dojah.lookupBvn(bvn);
    entity = result.entity;
  } catch (err) {
    if (err.statusCode === 404) {
      throw Object.assign(new Error(`No record found for that ${nin ? 'NIN' : 'BVN'} — please check and try again`), { statusCode: 400 });
    }
    throw Object.assign(new Error(`Verification failed: ${err.message}`), { statusCode: 502 });
  }

  const verifiedName = `${entity.first_name} ${entity.last_name}`.trim();
  const isMatch = namesRoughlyMatch(entity.first_name, user.firstName) && namesRoughlyMatch(entity.last_name, user.lastName);

  const update = {
    'kyc.submittedAt': new Date(),
    'kyc.verifiedName': verifiedName,
    status: isMatch ? 'active' : 'pending_kyc',
  };
  if (isMatch) update['kyc.verifiedAt'] = new Date();
  if (nin) update['kyc.nin'] = nin;
  if (bvn) update['kyc.bvn'] = bvn;

  const updated = await User.findByIdAndUpdate(userId, update, { new: true });
  return {
    ...sanitize(updated),
    message: isMatch
      ? 'Identity verified successfully!'
      : `The name on your account doesn't match the name on your ${nin ? 'NIN' : 'BVN'} record (${verifiedName}) — submitted for manual review.`,
  };
};

module.exports = { register, verifyOtp, login, refreshTokens, setPin, logout, resendOtp, forgotPassword, resetPassword, changePassword, confirmChangePassword, changePin, confirmChangePin, forgotPin, resetPin, updateProfile, submitKyc };
