const express = require('express');
const router = express.Router();
const ctrl = require('./data.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../../../middlewares/validate.middleware');

router.get('/networks', authenticate, ctrl.getAvailableNetworks);
router.get('/catalogs/:network', authenticate, ctrl.getCatalogs);
router.get('/plans/:network', authenticate, ctrl.getPlans);
router.post('/', authenticate, [
  body('network').isIn(['MTN', 'Airtel', 'Glo', '9mobile']).withMessage('Invalid network'),
  body('catalog').optional().isString(),
  body('phone').matches(/^\+?[0-9]{10,14}$/).withMessage('Invalid phone'),
  body('planId').notEmpty().withMessage('Plan ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount required'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN required'),
], validate, ctrl.buy);

router.post('/bulk', authenticate, [
  body('network').isIn(['MTN', 'Airtel', 'Glo', '9mobile']).withMessage('Invalid network'),
  body('catalog').optional().isString(),
  body('planId').notEmpty().withMessage('Plan ID required'),
  body('phones').isArray({ min: 2, max: 50 }).withMessage('Provide between 2 and 50 phone numbers'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN required'),
], validate, ctrl.bulkBuy);

module.exports = router;
