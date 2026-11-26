const axios = require('axios');
const env = require('../../config/env');

// ── PLACEHOLDER WIRE FORMAT — READ BEFORE GOING LIVE ────────────────────
//
// docs.esimaccess.com is a JavaScript-rendered single-page app; it returned
// no readable content when fetched, so the endpoint paths and auth header
// name below are UNCONFIRMED guesses, not verified against the real spec.
//
// What IS confirmed (from eSIM Access's own public marketing/FAQ pages):
//   - Auth is an API key in a request header (they also support optional
//     HMAC-SHA256 signing) — the exact header name was not disclosed publicly.
//   - Credentials are self-serve: sign up free, then get keys at
//     https://console.esimaccess.com/developer/index — no sales approval
//     needed for basic use.
//   - Their sample order response uses these field names: orderNo, iccid,
//     ac (an LPA activation string, e.g. "LPA:1$rsp.redtea.io$..."),
//     smdpStatus, totalVolume, durationUnit, orderUsage.
//
// BEFORE enabling this in production: log into the developer console,
// read the real API reference, and correct BASE_URL/ENDPOINTS/the auth
// header below. Nothing else in this feature depends on these specifics
// being right — esim.service.js only consumes this file's return shape.

const BASE_URL = env.ESIM_ACCESS_BASE_URL || 'https://api.esimaccess.com';

const ENDPOINTS = {
  listPackages: '/api/v1/open/package/list', // UNCONFIRMED path
  orderPackage: '/api/v1/open/esim/order',   // UNCONFIRMED path
  queryEsim: '/api/v1/open/esim/query',      // UNCONFIRMED path
};

const isConfigured = () => !!env.ESIM_ACCESS_API_KEY;

const requireConfigured = () => {
  if (!isConfigured()) {
    throw Object.assign(new Error('eSIM provider is not configured yet'), { statusCode: 503 });
  }
};

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use((config) => {
  // UNCONFIRMED header name — placeholder until verified against real docs.
  config.headers['RT-AccessCode'] = env.ESIM_ACCESS_API_KEY;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'eSIM Access request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    error.providerData = err.response?.data;
    throw error;
  }
);

const listPackages = async ({ countryCode }) => {
  requireConfigured();
  const { data } = await client.get(ENDPOINTS.listPackages, { params: { locationCode: countryCode } });
  return data;
};

const orderPackage = async ({ packageCode, transactionId }) => {
  requireConfigured();
  const { data } = await client.post(ENDPOINTS.orderPackage, {
    packageCode,
    transactionId: transactionId.toString(),
    count: 1,
  });
  return data;
};

const getEsimStatus = async (iccid) => {
  requireConfigured();
  const { data } = await client.get(ENDPOINTS.queryEsim, { params: { iccid } });
  return data;
};

module.exports = { isConfigured, listPackages, orderPackage, getEsimStatus };
