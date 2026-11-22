const referralService = require('./referral.service');
const { success, error } = require('../../utils/response');

const getStats = async (req, res, next) => {
  try {
    const data = await referralService.getStats(req.user._id);
    return success(res, data, 'Referral stats fetched');
  } catch (err) { next(err); }
};

const getHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await referralService.getHistory(req.user._id, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 50),
    });
    return success(res, data, 'Referral history fetched');
  } catch (err) { next(err); }
};

const getSignupBonus = async (req, res, next) => {
  try {
    const kobo = await referralService.getSignupBonus();
    return success(res, { amount: kobo / 100 }, 'Signup bonus fetched');
  } catch (err) { next(err); }
};

module.exports = { getStats, getHistory, getSignupBonus };
