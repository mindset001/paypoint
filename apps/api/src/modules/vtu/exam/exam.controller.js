const service = require('./exam.service');
const { success } = require('../../../utils/response');

const getTypes = async (req, res, next) => {
  try { return success(res, await service.getTypes(), 'Exam types fetched'); }
  catch (err) { next(err); }
};
const buy = async (req, res, next) => {
  try { return success(res, await service.buy(req.user._id, req.body), 'Exam PIN purchased'); }
  catch (err) { next(err); }
};

module.exports = { getTypes, buy };
