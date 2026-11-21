const settings = require('./settings.service');

const FLAGS_KEY = 'feature_flags';
// Matches what's currently live vs "Coming Soon" in the app — changing
// these here is the source of truth the frontend reads instead of its
// own hardcoded comingSoon flags.
const DEFAULT_FLAGS = { exam: false, reseller: false, savings: true };

const getFlags = async () => {
  const stored = await settings.get(FLAGS_KEY);
  return { ...DEFAULT_FLAGS, ...(stored || {}) };
};

const updateFlags = async (partial) => {
  const current = await getFlags();
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_FLAGS)) {
    if (partial[key] != null) next[key] = !!partial[key];
  }
  await settings.set(FLAGS_KEY, next);
  return next;
};

module.exports = { getFlags, updateFlags, DEFAULT_FLAGS };
