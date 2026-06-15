const express = require('express');
const router = express.Router();
const ctrl = require('./electricity.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');

router.post('/verify', authenticate, ctrl.verifyMeter);
router.post('/', authenticate, ctrl.pay);

module.exports = router;
