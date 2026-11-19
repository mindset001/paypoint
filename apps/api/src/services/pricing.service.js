// VTU margin model: regular users pay AidaPay's raw cost plus a markup;
// resellers ("agent" role, set manually by an admin after a WhatsApp
// request) pay raw cost. The gap between what a reseller pays here and
// what they charge their own downstream customers (outside this app) is
// their margin — there's no separate commission ledger to maintain.
const REGULAR_MARKUP = 0.02; // 2%
const RESELLER_MARKUP = 0;   // 0%

const isReseller = (user) => user?.role === 'agent';

const markupRate = (user) => (isReseller(user) ? RESELLER_MARKUP : REGULAR_MARKUP);

// rawAmountNGN is what AidaPay actually charges (or will charge) for this
// purchase — never trust a client-supplied final price for this calculation.
const priceFor = (rawAmountNGN, user) => {
  const rate = markupRate(user);
  return Math.round(rawAmountNGN * (1 + rate) * 100) / 100;
};

module.exports = { isReseller, markupRate, priceFor, REGULAR_MARKUP, RESELLER_MARKUP };
