const crypto = require('crypto');
const walletService = require('./wallet.service');
const { success, error } = require('../../utils/response');
const env = require('../../config/env');

const getWallet = async (req, res, next) => {
  try {
    const data = await walletService.getWallet(req.user._id);
    return success(res, data, 'Wallet fetched');
  } catch (err) { next(err); }
};

const initiateWalletFund = async (req, res, next) => {
  try {
    const { amount, provider = 'paystack' } = req.body;
    if (!amount || isNaN(amount)) return error(res, 'Valid amount is required', 400);
    const data = await walletService.initiateWalletFund(
      req.user._id,
      parseFloat(amount),
      req.user.email.address,
      provider,
    );
    return success(res, data, 'Payment initialized');
  } catch (err) { next(err); }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { provider, reference, transactionId } = req.body;
    if (!provider || !reference) return error(res, 'provider and reference are required', 400);
    const data = await walletService.verifyPayment(provider, reference, transactionId);
    return success(res, data, 'Payment verified');
  } catch (err) { next(err); }
};

const getVirtualAccount = async (req, res, next) => {
  try {
    const data = await walletService.getOrCreateVirtualAccount(req.user._id);
    return success(res, data, 'Virtual account fetched');
  } catch (err) { next(err); }
};

// ── Webhooks ────────────────────────────────────────────────────────────

const paystackWebhook = async (req, res, next) => {
  try {
    const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(req.body)  // raw Buffer
      .digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.sendStatus(401);
    }
    const event = JSON.parse(req.body);
    await walletService.handlePaystackWebhook(event);
    return res.sendStatus(200);
  } catch (err) { next(err); }
};

const flutterwaveWebhook = async (req, res, next) => {
  try {
    const hash = req.headers['verif-hash'];
    if (!env.FLUTTERWAVE_SECRET_HASH || hash !== env.FLUTTERWAVE_SECRET_HASH) {
      return res.sendStatus(401);
    }
    await walletService.handleFlutterwaveWebhook(req.body);
    return res.sendStatus(200);
  } catch (err) { next(err); }
};

const monnifyWebhook = async (req, res, next) => {
  try {
    if (env.MONNIFY_SECRET_KEY) {
      const { paymentReference, amountPaid, paidOn, transactionReference } = req.body?.eventData ?? {};
      const computed = crypto.createHmac('sha512', env.MONNIFY_SECRET_KEY)
        .update(`${paymentReference}|${amountPaid}|${paidOn}|${transactionReference}`)
        .digest('hex');
      if (computed !== req.headers['monnify-signature']) {
        return res.sendStatus(401);
      }
    }
    await walletService.handleMonnifyWebhook(req.body);
    return res.sendStatus(200);
  } catch (err) { next(err); }
};

const transfer = async (req, res, next) => {
  try {
    const { recipient, amount, pin } = req.body;
    if (!recipient || !amount || !pin) return error(res, 'Recipient, amount and PIN are required', 400);
    const data = await walletService.transfer(req.user._id, recipient, parseFloat(amount), pin);
    return success(res, data, 'Transfer successful');
  } catch (err) { next(err); }
};

const getTransactions = async (req, res, next) => {
  try {
    const { page, limit, type, status } = req.query;
    const data = await walletService.getTransactions(req.user._id, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 50),
      type, status,
    });
    return success(res, data, 'Transactions fetched');
  } catch (err) { next(err); }
};

module.exports = {
  getWallet, initiateWalletFund, verifyPayment, getVirtualAccount,
  paystackWebhook, flutterwaveWebhook, monnifyWebhook,
  transfer, getTransactions,
};
