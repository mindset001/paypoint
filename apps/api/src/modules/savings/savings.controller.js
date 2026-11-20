const savingsService = require('./savings.service');
const { success, error } = require('../../utils/response');

const createLock = async (req, res, next) => {
  try {
    const { name, amount, durationDays, pin } = req.body;
    if (!name || !amount || !durationDays || !pin) {
      return error(res, 'name, amount, durationDays and pin are required', 400);
    }
    const data = await savingsService.createLock(req.user._id, {
      name, amountNGN: parseFloat(amount), durationDays, pin,
    });
    return success(res, data, 'Savings locked', 201);
  } catch (err) { next(err); }
};

const getLocks = async (req, res, next) => {
  try {
    const data = await savingsService.getLocks(req.user._id);
    return success(res, data, 'Savings fetched');
  } catch (err) { next(err); }
};

const withdrawLock = async (req, res, next) => {
  try {
    const data = await savingsService.withdrawLock(req.user._id, req.params.id);
    return success(res, data, 'Savings withdrawn');
  } catch (err) { next(err); }
};

const topUpLock = async (req, res, next) => {
  try {
    const { amount, pin } = req.body;
    if (!amount || !pin) return error(res, 'amount and pin are required', 400);
    const data = await savingsService.topUpLock(req.user._id, req.params.id, parseFloat(amount), pin);
    return success(res, data, 'Savings topped up');
  } catch (err) { next(err); }
};

module.exports = { createLock, getLocks, withdrawLock, topUpLock };
