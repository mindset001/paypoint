const axios = require('axios');
const env = require('../../config/env');

const client = axios.create({
  baseURL: 'https://api.flutterwave.com/v3',
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || 'Flutterwave request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    throw error;
  }
);

const initializePayment = ({ txRef, amount, email, phone, name, redirectUrl, description, meta }) =>
  client.post('/payments', {
    tx_ref: txRef,
    amount,
    currency: 'NGN',
    redirect_url: redirectUrl,
    payment_options: 'card,banktransfer,ussd,account',
    customer: { email, phone_number: phone, name },
    meta,
    customizations: {
      title: 'PayPoint Wallet',
      description: description || 'Fund PayPoint wallet',
      logo: 'https://paypoint.ng/logo.png',
    },
  });

// Verify by transaction ID (returned in redirect callback)
const verifyById = (transactionId) =>
  client.get(`/transactions/${transactionId}/verify`);

// Verify by tx_ref (our reference)
const verifyByRef = async (txRef) => {
  const result = await client.get(`/transactions?tx_ref=${txRef}`);
  if (!result.data || result.data.length === 0) throw new Error('Transaction not found');
  // verify the specific transaction
  return verifyById(result.data[0].id);
};

const getBanks = (country = 'NG') =>
  client.get(`/banks/${country}`);

module.exports = { initializePayment, verifyById, verifyByRef, getBanks };
