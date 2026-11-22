const axios = require('axios');
const env = require('../../config/env');

const client = axios.create({
  baseURL: 'https://api.paystack.co',
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || 'Paystack request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    throw error;
  }
);

const initializeTransaction = ({ email, amount, reference, callbackUrl, metadata }) =>
  client.post('/transaction/initialize', {
    email, amount, reference,
    callback_url: callbackUrl,
    metadata,
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
  });

const verifyTransaction = (reference) =>
  client.get(`/transaction/verify/${reference}`);

// Fallback for the rare "Pay with Transfer" case where Paystack's dashboard
// shows a transaction as successful under our reference, but
// /transaction/verify/:reference still 404s on it (seen live — a confirmed
// Paystack-side indexing quirk on dynamic-account bank transfers). Fetching
// by Paystack's own numeric transaction ID instead reliably finds it.
const fetchTransactionById = (id) =>
  client.get(`/transaction/${id}`);

const getBanks = () =>
  client.get('/bank?currency=NGN&type=nuban');

const resolveAccount = (accountNumber, bankCode) =>
  client.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);

// Paystack actually resolves against real NIBSS bank records when creating
// a nuban recipient — even in test mode, a fabricated account number is
// rejected outright (confirmed live), not just in production.
const createTransferRecipient = ({ name, accountNumber, bankCode }) =>
  client.post('/transferrecipient', {
    type: 'nuban', name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN',
  });

// response.data.status can be "success", "pending", or "otp" (the business
// account itself has to approve via a code sent to the merchant's own
// registered contact — not something this app can or should route around).
// Only "success" is treated as final here; anything else is left "pending"
// and resolved later via the transfer.success/failed/reversed webhook.
const initiateTransfer = ({ amountKobo, recipientCode, reference, reason }) =>
  client.post('/transfer', {
    source: 'balance', amount: amountKobo, recipient: recipientCode, reference, reason,
  });

// Re-checks a transfer left "pending"/"otp" at initiation — used for manual
// admin reconciliation when the transfer.success/failed webhook never arrived.
const verifyTransfer = (transferCodeOrId) =>
  client.get(`/transfer/${transferCodeOrId}`);

module.exports = { initializeTransaction, verifyTransaction, fetchTransactionById, getBanks, resolveAccount, createTransferRecipient, initiateTransfer, verifyTransfer };
