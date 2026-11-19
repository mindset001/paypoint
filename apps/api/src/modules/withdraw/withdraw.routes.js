const express = require('express');
const router = express.Router();
const ctrl = require('./withdraw.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/banks',               authenticate, ctrl.getBanks);
router.post('/verify-account',     authenticate, ctrl.verifyAccount);
router.get('/accounts',            authenticate, ctrl.getBankAccounts);
router.post('/accounts',           authenticate, ctrl.addBankAccount);
router.delete('/accounts/:id',     authenticate, ctrl.deleteBankAccount);
router.post('/',                   authenticate, ctrl.withdraw);

module.exports = router;
