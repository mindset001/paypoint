const service = require('./data.service');
const { success } = require('../../../utils/response');

const getPlans = async (req, res, next) => {
  try {
    const data = await service.getPlans(req.params.network);
    return success(res, data, 'Plans fetched');
  } catch (err) { next(err); }
};

const buy = async (req, res, next) => {
  try {
    const data = await service.buy(req.user._id, req.body);
    return success(res, data, 'Data purchase successful');
  } catch (err) { next(err); }
};

module.exports = { getPlans, buy };
