const service = require('./electricity.service');
const { success } = require('../../../utils/response');

const verifyMeter = async (req, res, next) => {
  try { return success(res, await service.verifyMeter(req.body.disco, req.body.meterNumber, req.body.meterType), 'Meter verified'); }
  catch (err) { next(err); }
};
const pay = async (req, res, next) => {
  try { return success(res, await service.pay(req.user._id, req.body), 'Payment successful'); }
  catch (err) { next(err); }
};

module.exports = { verifyMeter, pay };
