const authService = require('./auth.service');
const { success, error } = require('../../utils/response');

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    return success(res, data, 'Verification code sent. Verify it to complete registration.', 201);
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyOtp({
      identifier: req.body.identifier,
      otpCode: req.body.otp,
    });
    return success(res, data, 'Phone verified. Welcome to Paycen!');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await authService.login({
      identifier: req.body.identifier,
      password: req.body.password,
      ip: req.ip,
    });
    return success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const data = await authService.googleAuth({ idToken: req.body.idToken, ip: req.ip });
    return success(res, data, 'Google sign-in successful');
  } catch (err) {
    next(err);
  }
};

const addPhone = async (req, res, next) => {
  try {
    const data = await authService.addPhone(req.user._id, req.body.phone);
    return success(res, data, 'Phone number added');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    return success(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

const setPin = async (req, res, next) => {
  try {
    const data = await authService.setPin(req.user._id, req.body.pin);
    return success(res, data, 'PIN set successfully');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const data = await authService.logout(req.user._id);
    return success(res, data, 'Logged out');
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const data = await authService.resendOtp(req.body.identifier);
    return success(res, data, 'OTP resent');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  // req.user is the raw Mongoose doc (see auth.middleware#authenticate), so
  // needsPhone isn't on it automatically the way it is on authService's own
  // sanitize() output — computed here too so a session restore (not just
  // the login/google response) still carries it for the dashboard guard.
  const user = { ...req.user.toObject(), needsPhone: !req.user.phone?.number };
  return success(res, { user }, 'Profile fetched');
};

const forgotPassword = async (req, res, next) => {
  try {
    const data = await authService.forgotPassword(req.body.identifier);
    return success(res, data, 'Reset code sent');
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const data = await authService.resetPassword(req.body.identifier, req.body.otp, req.body.newPassword);
    return success(res, data, 'Password reset successfully');
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const data = await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
    return success(res, data, 'Confirmation code sent');
  } catch (err) { next(err); }
};

const confirmChangePassword = async (req, res, next) => {
  try {
    const data = await authService.confirmChangePassword(req.user._id, req.body.otp);
    return success(res, data, 'Password changed');
  } catch (err) { next(err); }
};

const changePin = async (req, res, next) => {
  try {
    const data = await authService.changePin(req.user._id, req.body.currentPin, req.body.newPin);
    return success(res, data, 'Confirmation code sent');
  } catch (err) { next(err); }
};

const confirmChangePin = async (req, res, next) => {
  try {
    const data = await authService.confirmChangePin(req.user._id, req.body.otp);
    return success(res, data, 'PIN changed');
  } catch (err) { next(err); }
};

const forgotPin = async (req, res, next) => {
  try {
    const data = await authService.forgotPin(req.user._id);
    return success(res, data, 'Reset code sent');
  } catch (err) { next(err); }
};

const resetPin = async (req, res, next) => {
  try {
    const data = await authService.resetPin(req.user._id, req.body.otp, req.body.newPin);
    return success(res, data, 'PIN reset successfully');
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await authService.updateProfile(req.user._id, req.body);
    return success(res, data, 'Profile updated');
  } catch (err) { next(err); }
};

const submitKyc = async (req, res, next) => {
  try {
    const { message, ...user } = await authService.submitKyc(req.user._id, req.body);
    return success(res, user, message);
  } catch (err) { next(err); }
};

module.exports = { register, verifyOtp, login, googleAuth, addPhone, refresh, setPin, logout, resendOtp, me, forgotPassword, resetPassword, changePassword, confirmChangePassword, changePin, confirmChangePin, forgotPin, resetPin, updateProfile, submitKyc };
