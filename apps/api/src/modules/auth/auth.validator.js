const { body } = require('express-validator');

const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .matches(/^\+?[0-9]{10,14}$/)
    .withMessage('Valid phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('referralCode').optional().isString(),
];

const loginValidator = [
  body('identifier').notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOtpValidator = [
  body('identifier').notEmpty().withMessage('Identifier is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const setPinValidator = [
  body('pin')
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage('PIN must be 4–6 digits'),
  body('confirmPin').custom((val, { req }) => {
    if (val !== req.body.pin) throw new Error('PINs do not match');
    return true;
  }),
];

const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyOtpValidator,
  setPinValidator,
  refreshValidator,
};
