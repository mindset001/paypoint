const AidaPay = require('../providers/aidapay/aidapay.client');

// AidaPay can pull a provider off their platform without notice (e.g. MTN
// airtime disappearing entirely from GET /service/airtime-topup during an
// upstream outage) — short-lived cache so every page load doesn't re-fetch
// their provider list, but outages still clear within a couple of minutes.
const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map(); // slug -> { providers, expiresAt }

const getProviders = async (slug) => {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.providers;

  const result = await AidaPay.getProviders(slug);
  const providers = result.data?.data ?? [];
  cache.set(slug, { providers, expiresAt: Date.now() + CACHE_TTL_MS });
  return providers;
};

module.exports = { getProviders };
