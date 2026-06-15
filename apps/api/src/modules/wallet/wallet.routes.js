const express = require('express');
const router = express.Router();
const ctrl = require('./wallet.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/',                   authenticate, ctrl.getWallet);
router.post('/fund',              authenticate, ctrl.initiateWalletFund);
router.post('/fund/verify',       authenticate, ctrl.verifyPayment);
router.get('/virtual-account',    authenticate, ctrl.getVirtualAccount);
router.post('/transfer',          authenticate, ctrl.transfer);
router.get('/transactions',       authenticate, ctrl.getTransactions);

// Webhooks — no auth, provider-signed
router.post('/webhook/paystack',    express.raw({ type: '*/*' }), ctrl.paystackWebhook);
router.post('/webhook/flutterwave', ctrl.flutterwaveWebhook);
router.post('/webhook/monnify',     ctrl.monnifyWebhook);

module.exports = router;
