const authService = require('./auth.service');
const { success, error } = require('../../utils/response');

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    return success(res, data, 'Registration successful. OTP sent.', 201);
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
    return success(res, data, 'Phone verified. Welcome to PayPoint!');
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
  return success(res, { user: req.user }, 'Profile fetched');
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
    return success(res, data, 'Password changed');
  } catch (err) { next(err); }
};

const changePin = async (req, res, next) => {
  try {
    const data = await authService.changePin(req.user._id, req.body.currentPin, req.body.newPin);
    return success(res, data, 'PIN changed');
  } catch (err) { next(err); }
};

module.exports = { register, verifyOtp, login, refresh, setPin, logout, resendOtp, me, forgotPassword, resetPassword, changePassword, changePin };
