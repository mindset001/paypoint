const express = require('express');
const router = express.Router();
const ctrl = require('./exam.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');

router.get('/plans', authenticate, ctrl.getPlans);
router.post('/', authenticate, ctrl.buy);

module.exports = router;
