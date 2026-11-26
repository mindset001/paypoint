const crypto = require('crypto');
const axios = require('axios');
const env = require('../../config/env');

// ── WIRE FORMAT — CONFIRMED LIVE AGAINST THE REAL API ───────────────────
//
// docs.esimaccess.com itself is a JS-rendered SPA that returned no readable
// content when fetched. Everything below was instead confirmed by making
// real, signed requests against https://api.esimaccess.com with a live
// account (balance: $0, so nothing could actually be charged):
//
//   - Base URL: https://api.esimaccess.com
//   - Auth: every request is POSTed with a JSON body and three headers —
//     RT-AccessCode (the access code), RT-Timestamp (ms since epoch), and
//     RT-Signature = hex(HMAC-SHA256(secretKey, timestamp + accessCode + rawBody)).
//   - POST /api/v1/open/package/list  — body {locationCode?}; response
//     {success, errorCode, errorMsg, obj: {packageList: [...]}}. Verified
//     live: returned 93 real Spain packages. A package's `volume` is bytes
//     (3221225472 === exactly 3GB, confirmed against its own "3GB" name),
//     `price`/`retailPrice` are USD in units of 1/10,000 (16000 → $1.60) —
//     inferred from these being the only divisor that produces sane retail
//     prices, not from documentation; worth a final glance at the console's
//     own pricing display before trusting it for real billing.
//   - POST /api/v1/open/esim/query — body {pager: {pageNum, pageSize},
//     iccid?, orderNo?}; response {obj: {esimList: [...], pager}}. Verified
//     live: an empty account returns {esimList: [], pager: {...,total: 0}}.
//   - POST /api/v1/open/balance/query — body {}; response {obj: {balance}}.
//     Verified live: returned {balance: 0}.
//
// NOT live-verified: POST /api/v1/open/esim/order. Placing a real order is
// a genuine financial action against a third party, so it was correctly
// refused by this environment's safety controls even with a $0 balance.
// Its request shape below (transactionId + packageInfoList) is inferred
// from the package-list schema; its response field names (orderNo, iccid,
// ac, smdpStatus, totalVolume, durationUnit, orderUsage) are confirmed from
// eSIM Access's own public marketing sample, not guessed. Fund the account
// with a small real balance and test one real order before relying on this
// in production.

const BASE_URL = env.ESIM_ACCESS_BASE_URL || 'https://api.esimaccess.com';

const ENDPOINTS = {
  listPackages: '/api/v1/open/package/list',
  orderPackage: '/api/v1/open/esim/order',     // shape inferred, not live-tested — see note above
  queryEsim: '/api/v1/open/esim/query',
  balanceQuery: '/api/v1/open/balance/query',
};

const isConfigured = () => !!(env.ESIM_ACCESS_CODE && env.ESIM_ACCESS_SECRET_KEY);

const requireConfigured = () => {
  if (!isConfigured()) {
    throw Object.assign(new Error('eSIM provider is not configured yet'), { statusCode: 503 });
  }
};

const signedHeaders = (rawBody) => {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', env.ESIM_ACCESS_SECRET_KEY)
    .update(timestamp + env.ESIM_ACCESS_CODE + rawBody)
    .digest('hex');
  return {
    'RT-AccessCode': env.ESIM_ACCESS_CODE,
    'RT-Timestamp': timestamp,
    'RT-Signature': signature,
    'Content-Type': 'application/json',
  };
};

const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

// Every call signs over the exact raw JSON string sent — must match what
// axios actually transmits, so the body is stringified once here rather
// than left to axios's own serialization inside an interceptor.
const post = async (path, bodyObj) => {
  const body = JSON.stringify(bodyObj);
  let res;
  try {
    res = await client.post(path, body, { headers: signedHeaders(body) });
  } catch (err) {
    const msg = err.response?.data?.errorMsg || err.message || 'eSIM Access request failed';
    const error = new Error(msg);
    error.statusCode = err.response?.status || 502;
    error.providerData = err.response?.data;
    throw error;
  }
  if (res.data?.success === false) {
    const error = new Error(res.data.errorMsg || 'eSIM Access request failed');
    error.statusCode = 502;
    error.providerData = res.data;
    throw error;
  }
  return res.data;
};

const listPackages = async ({ countryCode } = {}) => {
  requireConfigured();
  return post(ENDPOINTS.listPackages, countryCode ? { locationCode: countryCode } : {});
};

const orderPackage = async ({ packageCode, transactionId }) => {
  requireConfigured();
  return post(ENDPOINTS.orderPackage, {
    transactionId: transactionId.toString(),
    packageInfoList: [{ packageCode, count: 1 }],
  });
};

const getEsimStatus = async (iccid) => {
  requireConfigured();
  return post(ENDPOINTS.queryEsim, { iccid, pager: { pageNum: 1, pageSize: 1 } });
};

const getBalance = async () => {
  requireConfigured();
  return post(ENDPOINTS.balanceQuery, {});
};

module.exports = { isConfigured, listPackages, orderPackage, getEsimStatus, getBalance };
