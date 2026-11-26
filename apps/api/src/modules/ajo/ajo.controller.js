const ajoService = require('./ajo.service');
const { success, error } = require('../../utils/response');

const createPlan = async (req, res, next) => {
  try {
    const { name, mode, frequency, intervalDays, amount, totalSlots, totalCycles } = req.body;
    if (!name || !mode || !frequency || !amount) {
      return error(res, 'name, mode, frequency and amount are required', 400);
    }
    const data = await ajoService.createPlan(req.user._id, {
      name, mode, frequency, intervalDays, amountNGN: parseFloat(amount), totalSlots, totalCycles,
    });
    return success(res, data, 'Ajo plan created', 201);
  } catch (err) { next(err); }
};

const joinPlan = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return error(res, 'inviteCode is required', 400);
    const data = await ajoService.joinPlan(req.user._id, inviteCode);
    return success(res, data, 'Joined Ajo group');
  } catch (err) { next(err); }
};

const startPlan = async (req, res, next) => {
  try {
    const data = await ajoService.startPlan(req.user._id, req.params.id);
    return success(res, data, 'Ajo group started');
  } catch (err) { next(err); }
};

const cancelPlan = async (req, res, next) => {
  try {
    const data = await ajoService.cancelPlan(req.user._id, req.params.id);
    return success(res, data, 'Ajo plan cancelled');
  } catch (err) { next(err); }
};

const forceSettle = async (req, res, next) => {
  try {
    const data = await ajoService.forceSettle(req.user._id, req.params.id, req.params.cid);
    return success(res, data, 'Contribution settled');
  } catch (err) { next(err); }
};

const listMyPlans = async (req, res, next) => {
  try {
    const data = await ajoService.listMyPlans(req.user._id);
    return success(res, data, 'Ajo plans fetched');
  } catch (err) { next(err); }
};

const getPlan = async (req, res, next) => {
  try {
    const data = await ajoService.getPlan(req.user._id, req.params.id);
    return success(res, data, 'Ajo plan fetched');
  } catch (err) { next(err); }
};

module.exports = { createPlan, joinPlan, startPlan, cancelPlan, forceSettle, listMyPlans, getPlan };
