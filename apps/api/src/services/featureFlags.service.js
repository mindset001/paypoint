const settings = require('./settings.service');

const FLAGS_KEY = 'feature_flags';
const VALID_STATUSES = ['live', 'coming_soon', 'hidden'];

// Matches what's currently shown in the app — changing these here is the
// source of truth the frontend reads instead of a hardcoded comingSoon flag.
// 'live' = fully usable, 'coming_soon' = visible but disabled with a badge,
// 'hidden' = not shown at all.
const DEFAULT_FLAGS = {
  exam: 'coming_soon',
  reseller: 'coming_soon',
  savings: 'live',
  // Wallet funding providers — paystack is the only one actually wired up
  // and verified live; flutterwave/monnify have client code but no verified
  // live integration yet.
  paystack: 'live',
  flutterwave: 'coming_soon',
  monnify: 'coming_soon',
  // KYC verification methods on the Identity Verification page — bvn/nin
  // go through Dojah today; "number" (phone-based verification) has no
  // automated provider wired up, so a submission there is just queued for
  // manual admin review instead of an automated lookup.
  kyc_bvn: 'live',
  kyc_nin: 'live',
  kyc_number: 'coming_soon',
};

// Earlier today this setting stored plain booleans (true = live, false =
// coming soon, no "hidden" concept yet) — coerce any leftover legacy value
// rather than leak it past VALID_STATUSES into the frontend unrecognized.
const migrateLegacyValue = (value) => {
  if (typeof value === 'boolean') return value ? 'live' : 'coming_soon';
  return value;
};

const getFlags = async () => {
  const stored = await settings.get(FLAGS_KEY);
  const merged = { ...DEFAULT_FLAGS, ...(stored || {}) };
  for (const key of Object.keys(DEFAULT_FLAGS)) {
    merged[key] = migrateLegacyValue(merged[key]);
  }
  return merged;
};

const updateFlags = async (partial) => {
  const current = await getFlags();
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_FLAGS)) {
    if (partial[key] != null) {
      if (!VALID_STATUSES.includes(partial[key])) {
        throw Object.assign(new Error(`Invalid status "${partial[key]}" for ${key} — must be one of ${VALID_STATUSES.join(', ')}`), { statusCode: 400 });
      }
      next[key] = partial[key];
    }
  }
  await settings.set(FLAGS_KEY, next);
  return next;
};

module.exports = { getFlags, updateFlags, DEFAULT_FLAGS, VALID_STATUSES };
