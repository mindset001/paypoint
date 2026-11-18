const axios = require('axios');
const env = require('../../config/env');

// Matches AidaPay's real documented API at {base}/v1 — see their live docs
// at https://aidapay.ng/api. The previous version of this file targeted
// endpoints (/topup, /cable, /electricity, /exam, /data/plans/:network)
// that don't exist on their platform; every service slug, path and request
// shape below was taken directly from AidaPay's own docs page, not guessed.

const client = axios.create({
  baseURL: env.AIDAPAY_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
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

// Service slugs, per AidaPay's docs — the only ones they document.
const SLUGS = {
  airtime: 'airtime-topup',
  data: 'data-bundle-sme',
  cable: 'cable-tv-subscription',
  electricity: 'meter-token',
  exam: 'education',
  internet: 'internet',
};

// ─── Account ─────────────────────────────────────────────────────────────
const getAccountInfo = () => client.get('/my_account');

// ─── Providers & packages ────────────────────────────────────────────────
const getProviders = (slug) => client.get(`/service/${slug}`);
const getPackages = (providerCode) => client.get(`/packages/${encodeURIComponent(providerCode)}`);

// Resolve a human-facing name (e.g. "MTN", "DSTV", "IKEDC") to AidaPay's
// provider_code for a given service slug — their codes aren't predictable
// enough to hardcode, so this always looks them up live.
const resolveProviderCode = async (slug, providerName) => {
  const res = await getProviders(slug);
  const providers = res.data?.data ?? [];
  const match = providers.find(
    (p) => p.provider_name?.toLowerCase() === providerName.toLowerCase()
  );
  if (!match) {
    throw Object.assign(new Error(`${providerName} is not available on AidaPay for this service`), { statusCode: 400 });
  }
  return match.provider_code;
};

// ─── Validation ──────────────────────────────────────────────────────────
const validateRecipient = (providerCode, recipient) =>
  client.get(`/validation/${encodeURIComponent(providerCode)}/${encodeURIComponent(recipient)}`);

// Returns { name } parsed from AidaPay's "Verified : NAME" message —
// that's all the validation endpoint gives back, there's no separate
// address/account field.
const verifyRecipient = async (providerCode, recipient) => {
  const res = await validateRecipient(providerCode, recipient);
  const body = res.data?.data;
  if (!body?.verified) {
    throw Object.assign(new Error(body?.message || 'Could not verify recipient'), { statusCode: 400 });
  }
  const name = String(body.message || '').replace(/^Verified\s*:\s*/i, '').trim();
  return { name };
};

// ─── Buy ─────────────────────────────────────────────────────────────────
// amount is omitted when a package_code is given (data/cable bundles carry
// their own price) — passing both is what AidaPay's docs show as mutually
// exclusive use cases, not a combined one.
const buy = async ({ recipient, providerCode, ref, amount, packageCode, isPorted }) => {
  const body = {
    recipient,
    provider_code: providerCode,
    account_pin: env.AIDAPAY_ACCOUNT_PIN,
    ref,
  };
  if (packageCode) body.package_code = packageCode;
  else if (amount != null) body.amount = String(amount);
  if (isPorted) body.isPorted = 'yes';

  const res = await client.post('/buy', body);
  // AidaPay can return HTTP 200 with a body-level failure (e.g. a wrong
  // account_pin) — axios only rejects on HTTP error status, so this has to
  // be checked explicitly or a rejected purchase gets treated as a success.
  if (res.data?.success === false) {
    throw Object.assign(new Error(res.data?.message || 'AidaPay rejected the purchase'), {
      statusCode: 502,
      providerData: res.data,
    });
  }
  return res;
};

// ─── Status ──────────────────────────────────────────────────────────────
// Rate-limited by AidaPay to 3 requests / 5 minutes — prefer webhooks.
const getTransactionStatus = (transactionHashOrRef) =>
  client.get(`/transaction/${encodeURIComponent(transactionHashOrRef)}`);

// ─── Pricing ─────────────────────────────────────────────────────────────
const getPricing = () => client.get('/pricing');

module.exports = {
  SLUGS,
  getAccountInfo,
  getProviders,
  getPackages,
  resolveProviderCode,
  validateRecipient,
  verifyRecipient,
  buy,
  getTransactionStatus,
  getPricing,
};
