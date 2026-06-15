const express = require('express');
const router = express.Router();
const ctrl = require('./data.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../../../middlewares/validate.middleware');

router.get('/plans/:network', authenticate, ctrl.getPlans);
router.post('/', authenticate, [
  body('network').isIn(['MTN', 'Airtel', 'Glo', '9mobile']).withMessage('Invalid network'),
  body('phone').matches(/^\+?[0-9]{10,14}$/).withMessage('Invalid phone'),
  body('planId').notEmpty().withMessage('Plan ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount required'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN required'),
], validate, ctrl.buy);

module.exports = router;
