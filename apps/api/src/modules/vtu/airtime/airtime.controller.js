const service = require('./airtime.service');
const { success } = require('../../../utils/response');

const buy = async (req, res, next) => {
  try {
    const data = await service.buy(req.user._id, req.body);
    return success(res, data, 'Airtime purchase successful');
  } catch (err) { next(err); }
};

module.exports = { buy };
