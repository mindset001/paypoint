const service = require('./recent.service');
const { success } = require('../../../utils/response');

const getRecentNumbers = async (req, res, next) => {
  try {
    const data = await service.getRecentNumbers(req.user._id);
    return success(res, data, 'Recent numbers fetched');
  } catch (err) { next(err); }
};

module.exports = { getRecentNumbers };
