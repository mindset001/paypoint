const settings = require('./settings.service');

const PRICES_KEY = 'data_plan_prices';

// { [planId]: { customer: priceKobo, agent: priceKobo } } — keyed by
// AidaPay's package_api_code. A plan with no entry here is unpriced and
// must be hidden from purchase, never sold at AidaPay's raw cost by
// accident (see data.service.js#getPlans/buy).
const getAllPrices = async () => settings.get(PRICES_KEY, {});

const getPriceKobo = async (planId, isReseller) => {
  const all = await getAllPrices();
  const entry = all[planId];
  if (!entry) return null;
  const kobo = isReseller ? entry.agent : entry.customer;
  return kobo ?? null;
};

const setPrice = async (planId, { customer, agent }) => {
  if (customer == null || agent == null || customer < 0 || agent < 0) {
    throw Object.assign(new Error('Both customer and reseller prices are required and must be non-negative'), { statusCode: 400 });
  }
  const all = await getAllPrices();
  all[planId] = { customer: Math.round(customer), agent: Math.round(agent) };
  await settings.set(PRICES_KEY, all);
  return all[planId];
};

const removePrice = async (planId) => {
  const all = await getAllPrices();
  delete all[planId];
  await settings.set(PRICES_KEY, all);
};

module.exports = { getAllPrices, getPriceKobo, setPrice, removePrice };
