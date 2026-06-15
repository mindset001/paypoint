const express = require('express');
const router = express.Router();
const ctrl = require('./exam.controller');
const { authenticate } = require('../../../middlewares/auth.middleware');

router.get('/types', authenticate, ctrl.getTypes);
router.post('/', authenticate, ctrl.buy);

module.exports = router;
