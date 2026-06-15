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

const getBanks = () =>
  client.get('/bank?currency=NGN&type=nuban');

const resolveAccount = (accountNumber, bankCode) =>
  client.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);

module.exports = { initializeTransaction, verifyTransaction, getBanks, resolveAccount };
