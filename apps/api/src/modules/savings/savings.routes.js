const express = require('express');
const router = express.Router();
const ctrl = require('./savings.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/',              authenticate, ctrl.getLocks);
router.post('/',             authenticate, ctrl.createLock);
router.post('/:id/withdraw', authenticate, ctrl.withdrawLock);

module.exports = router;
