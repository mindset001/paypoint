const express = require('express');
const router = express.Router();
const ctrl = require('./recent.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');

router.get('/numbers', authenticate, ctrl.getRecentNumbers);

module.exports = router;
