const service = require('./cable.service');
const { success } = require('../../../utils/response');

const getPlans = async (req, res, next) => {
  try { return success(res, await service.getPlans(req.params.provider), 'Plans fetched'); }
  catch (err) { next(err); }
};
const verifySmartcard = async (req, res, next) => {
  try { return success(res, await service.verifySmartcard(req.body.provider, req.body.smartcardNumber), 'Smartcard verified'); }
  catch (err) { next(err); }
};
const subscribe = async (req, res, next) => {
  try { return success(res, await service.subscribe(req.user._id, req.body), 'Subscription successful'); }
  catch (err) { next(err); }
};

module.exports = { getPlans, verifySmartcard, subscribe };
