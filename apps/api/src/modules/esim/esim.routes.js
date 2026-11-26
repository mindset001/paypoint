const express = require('express');
const router = express.Router();
const ctrl = require('./esim.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/countries',        authenticate, ctrl.getCountries);
router.get('/packages',        authenticate, ctrl.getPackages);
router.post('/buy',            authenticate, ctrl.buy);
router.get('/my',              authenticate, ctrl.getMyEsims);
router.get('/:id',             authenticate, ctrl.getEsim);
router.post('/:id/refresh',    authenticate, ctrl.refreshStatus);

module.exports = router;
