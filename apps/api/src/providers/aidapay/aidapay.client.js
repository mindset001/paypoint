const axios = require('axios');
const env = require('../../config/env');

const client = axios.create({
  baseURL: env.AIDAPAY_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.AIDAPAY_API_KEY}`,
  },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'AidaPay request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    error.providerData = err.response?.data;
    throw error;
  }
);

// ─── Airtime ───────────────────────────────────────────────────────────────
const buyAirtime = (network, phone, amount) =>
  client.post('/topup', { network, phone, amount, type: 'airtime' });

// ─── Data ──────────────────────────────────────────────────────────────────
const getDataPlans = (network) =>
  client.get(`/data/plans/${network}`);

const buyData = (network, phone, planId) =>
  client.post('/topup', { network, phone, planId, type: 'data' });

// ─── Cable TV ──────────────────────────────────────────────────────────────
const getCablePlans = (provider) =>
  client.get(`/cable/plans/${provider}`);

const verifySmartcard = (provider, smartcardNumber) =>
  client.post('/cable/verify', { provider, smartcardNumber });

const subscribeCable = (provider, smartcardNumber, planCode) =>
  client.post('/cable', { provider, smartcardNumber, planCode });

// ─── Electricity ───────────────────────────────────────────────────────────
const verifyMeter = (disco, meterNumber, meterType) =>
  client.post('/electricity/verify', { disco, meterNumber, meterType });

const payElectricity = (disco, meterNumber, meterType, amount, phone) =>
  client.post('/electricity', { disco, meterNumber, meterType, amount, phone });

// ─── Exam Pins ─────────────────────────────────────────────────────────────
const getExamTypes = () =>
  client.get('/exam/types');

const buyExamPin = (examType, quantity = 1) =>
  client.post('/exam', { examType, quantity });

module.exports = {
  buyAirtime,
  getDataPlans, buyData,
  getCablePlans, verifySmartcard, subscribeCable,
  verifyMeter, payElectricity,
  getExamTypes, buyExamPin,
};
