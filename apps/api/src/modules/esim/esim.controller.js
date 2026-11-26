const esimService = require('./esim.service');
const { success, error } = require('../../utils/response');

const getPackages = async (req, res, next) => {
  try {
    const data = await esimService.getPackages(req.query.country);
    return success(res, data, 'eSIM packages fetched');
  } catch (err) { next(err); }
};

const buy = async (req, res, next) => {
  try {
    const { packageCode, pin } = req.body;
    if (!packageCode || !pin) return error(res, 'packageCode and pin are required', 400);
    const data = await esimService.buy(req.user._id, { packageCode, pin });
    return success(res, data, 'eSIM purchased', 201);
  } catch (err) { next(err); }
};

const getMyEsims = async (req, res, next) => {
  try {
    const data = await esimService.getMyEsims(req.user._id);
    return success(res, data, 'eSIMs fetched');
  } catch (err) { next(err); }
};

const getEsim = async (req, res, next) => {
  try {
    const data = await esimService.getEsim(req.user._id, req.params.id);
    return success(res, data, 'eSIM fetched');
  } catch (err) { next(err); }
};

const refreshStatus = async (req, res, next) => {
  try {
    const data = await esimService.refreshStatus(req.user._id, req.params.id);
    return success(res, data, 'eSIM status refreshed');
  } catch (err) { next(err); }
};

module.exports = { getPackages, buy, getMyEsims, getEsim, refreshStatus };
