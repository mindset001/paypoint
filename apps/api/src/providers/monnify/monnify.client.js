const axios = require('axios');
const env = require('../../config/env');

let _tokenCache = null; // { token, expiresAt }

const BASE_URL = env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';

const http = axios.create({ baseURL: BASE_URL, timeout: 20000 });

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.responseMessage || err.response?.data?.message || 'Monnify request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    throw error;
  }
);

const getAccessToken = async () => {
  if (_tokenCache && _tokenCache.expiresAt > Date.now()) return _tokenCache.token;

  const credentials = Buffer.from(`${env.MONNIFY_API_KEY}:${env.MONNIFY_SECRET_KEY}`).toString('base64');
  const res = await http.post('/api/v1/auth/login', {}, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  const token = res.responseBody?.accessToken;
  const expiresIn = (res.responseBody?.expiresIn ?? 3600) * 1000;
  _tokenCache = { token, expiresAt: Date.now() + expiresIn - 60000 };
  return token;
};

const authHeaders = async () => {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
};

const initializeTransaction = async ({ amount, customerName, customerEmail, paymentReference, paymentDescription, redirectUrl }) => {
  const headers = await authHeaders();
  return http.post('/api/v1/merchant/transactions/init-transaction', {
    amount,
    customerName,
    customerEmail,
    paymentReference,
    paymentDescription,
    contractCode: env.MONNIFY_CONTRACT_CODE,
    redirectUrl,
    paymentMethods: ['ACCOUNT_TRANSFER', 'CARD'],
    currencyCode: 'NGN',
  }, { headers });
};

const verifyTransaction = async (paymentReference) => {
  const headers = await authHeaders();
  const encoded = encodeURIComponent(paymentReference);
  return http.get(`/api/v2/merchant/transactions/query?paymentReference=${encoded}`, { headers });
};

const reserveAccount = async ({ accountReference, accountName, email, bvn }) => {
  const headers = await authHeaders();
  return http.post('/api/v2/bank-transfer/reserved-accounts', {
    accountReference,
    accountName,
    currencyCode: 'NGN',
    contractCode: env.MONNIFY_CONTRACT_CODE,
    customerEmail: email,
    customerName: accountName,
    customerBvn: bvn,
    restrictPaymentSource: false,
  }, { headers });
};

const getReservedAccount = async (accountReference) => {
  const headers = await authHeaders();
  return http.get(`/api/v2/bank-transfer/reserved-accounts/${accountReference}`, { headers });
};

module.exports = { initializeTransaction, verifyTransaction, reserveAccount, getReservedAccount, getAccessToken };
