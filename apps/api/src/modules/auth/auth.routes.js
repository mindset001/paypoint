const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  registerValidator,
  loginValidator,
  verifyOtpValidator,
  setPinValidator,
  refreshValidator,
} = require('./auth.validator');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, try again later.' },
});

router.post('/register', authLimiter, registerValidator, validate, ctrl.register);
router.post('/verify-otp', authLimiter, verifyOtpValidator, validate, ctrl.verifyOtp);
router.post('/resend-otp', authLimiter, ctrl.resendOtp);
router.post('/login', authLimiter, loginValidator, validate, ctrl.login);
router.post('/refresh', refreshValidator, validate, ctrl.refresh);
router.post('/set-pin', authenticate, setPinValidator, validate, ctrl.setPin);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, ctrl.resetPassword);
router.patch('/change-password', authenticate, ctrl.changePassword);
router.patch('/change-pin', authenticate, ctrl.changePin);

module.exports = router;
