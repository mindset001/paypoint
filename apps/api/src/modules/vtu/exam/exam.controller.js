const service = require('./exam.service');
const { success } = require('../../../utils/response');

const getPlans = async (req, res, next) => {
  try { return success(res, await service.getPlans(req.user), 'Exam plans fetched'); }
  catch (err) { next(err); }
};
const buy = async (req, res, next) => {
  try { return success(res, await service.buy(req.user._id, req.body), 'Exam PIN purchased'); }
  catch (err) { next(err); }
};

module.exports = { getPlans, buy };
