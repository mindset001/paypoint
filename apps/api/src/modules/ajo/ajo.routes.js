const express = require('express');
const router = express.Router();
const ctrl = require('./ajo.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/',                        authenticate, ctrl.listMyPlans);
router.post('/',                       authenticate, ctrl.createPlan);
router.post('/join',                   authenticate, ctrl.joinPlan);
router.get('/:id',                     authenticate, ctrl.getPlan);
router.post('/:id/start',              authenticate, ctrl.startPlan);
router.post('/:id/cancel',             authenticate, ctrl.cancelPlan);
router.post('/:id/contributions/:cid/force', authenticate, ctrl.forceSettle);

module.exports = router;
