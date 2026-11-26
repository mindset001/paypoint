const service = require('./airtime.service');
const { success } = require('../../../utils/response');

const getAvailableNetworks = async (req, res, next) => {
  try {
    const data = await service.getAvailableNetworks();
    return success(res, data, 'Available networks fetched');
  } catch (err) { next(err); }
};

const buy = async (req, res, next) => {
  try {
    const data = await service.buy(req.user._id, req.body);
    return success(res, data, 'Airtime purchase successful');
  } catch (err) { next(err); }
};

const bulkBuy = async (req, res, next) => {
  try {
    const data = await service.bulkBuy(req.user._id, req.body);
    return success(res, data, 'Bulk airtime purchase processed');
  } catch (err) { next(err); }
};

module.exports = { buy, bulkBuy, getAvailableNetworks };
