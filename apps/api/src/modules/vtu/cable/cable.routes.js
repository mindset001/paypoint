const express = require('express');
const router = express.Router();
const ctrl = require('./cable.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');

router.get('/plans/:provider', authenticate, ctrl.getPlans);
router.post('/verify', authenticate, ctrl.verifySmartcard);
router.post('/', authenticate, ctrl.subscribe);

module.exports = router;
