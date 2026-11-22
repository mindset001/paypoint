const express = require('express');
const router = express.Router();
const ctrl = require('./referral.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/stats',        authenticate, ctrl.getStats);
router.get('/history',      authenticate, ctrl.getHistory);
// Public — shown on the registration page before the visitor has an account.
router.get('/signup-bonus', ctrl.getSignupBonus);

module.exports = router;
