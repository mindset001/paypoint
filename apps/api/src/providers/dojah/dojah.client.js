const axios = require('axios');
const env = require('../../config/env');

// Auth per Dojah's docs: Authorization is the raw secret key — no "Bearer"
// prefix (adding one causes a 401) — plus an AppId header.
const client = axios.create({
  baseURL: env.DOJAH_BASE_URL,
  timeout: 20000,
  headers: {
    Authorization: env.DOJAH_SECRET_KEY,
    AppId: env.DOJAH_APP_ID,
  },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const msg = status === 404
      ? 'No record found for that number'
      : err.response?.data?.message || err.message || 'Dojah request failed';
    const error = new Error(msg);
    error.statusCode = status === 404 ? 404 : (status || 502);
    throw error;
  }
);

const lookupNin = (nin) => client.get('/api/v1/kyc/nin', { params: { nin } });
const lookupBvn = (bvn) => client.get('/api/v1/kyc/bvn/full', { params: { bvn } });

module.exports = { lookupNin, lookupBvn };
