// VTU pricing model: everyone pays AidaPay's raw cost, no markup. A
// reseller's margin (if any) comes from what they charge their own
// downstream customers outside this app — there's no markup or
// commission ledger to maintain here.
const REGULAR_MARKUP = 0;
const RESELLER_MARKUP = 0;

const isReseller = (user) => user?.role === 'agent';

const markupRate = (user) => (isReseller(user) ? RESELLER_MARKUP : REGULAR_MARKUP);

// rawAmountNGN is what AidaPay actually charges (or will charge) for this
// purchase — never trust a client-supplied final price for this calculation.
const priceFor = (rawAmountNGN, user) => {
  const rate = markupRate(user);
  return Math.round(rawAmountNGN * (1 + rate) * 100) / 100;
};

module.exports = { isReseller, markupRate, priceFor, REGULAR_MARKUP, RESELLER_MARKUP };
