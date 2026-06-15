const express = require('express');
const router = express.Router();
const ctrl = require('./airtime.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../../../middlewares/validate.middleware');

router.post('/', authenticate, [
  body('network').isIn(['MTN', 'Airtel', 'Glo', '9mobile']).withMessage('Invalid network'),
  body('phone').matches(/^\+?[0-9]{10,14}$/).withMessage('Invalid phone number'),
  body('amount').isFloat({ min: 50, max: 50000 }).withMessage('Amount must be ₦50–₦50,000'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN required'),
], validate, ctrl.buy);

module.exports = router;
