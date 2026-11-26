const service = require('./data.service');
const { success } = require('../../../utils/response');

const getCatalogs = async (req, res, next) => {
  try {
    const data = service.getCatalogs(req.params.network);
    return success(res, data, 'Catalogs fetched');
  } catch (err) { next(err); }
};

const getPlans = async (req, res, next) => {
  try {
    const data = await service.getPlans(req.params.network, req.query.catalog, req.user);
    return success(res, data, 'Plans fetched');
  } catch (err) { next(err); }
};

const buy = async (req, res, next) => {
  try {
    const data = await service.buy(req.user._id, req.body);
    return success(res, data, 'Data purchase successful');
  } catch (err) { next(err); }
};

const bulkBuy = async (req, res, next) => {
  try {
    const data = await service.bulkBuy(req.user._id, req.body);
    return success(res, data, 'Bulk data purchase processed');
  } catch (err) { next(err); }
};

module.exports = { getCatalogs, getPlans, buy, bulkBuy };
