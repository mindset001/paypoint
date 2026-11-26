const adminService = require('./admin.service');
const { success, error } = require('../../utils/response');

const getStats = async (req, res) => {
  try {
    const data = await adminService.getStats();
    return success(res, data, 'Stats fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getUsers = async (req, res) => {
  try {
    const { page, limit, search, role, status } = req.query;
    const data = await adminService.getUsers({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
      search: search ?? '',
      role: role ?? '',
      status: status ?? '',
    });
    return success(res, data, 'Users fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const data = await adminService.getUserById(req.params.id);
    if (!data) return error(res, 'User not found', 404);
    return success(res, data, 'User fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) return error(res, 'status is required', 400);
    const user = await adminService.updateUserStatus(req.params.id, status, { adminId: req.user._id, reason, ip: req.ip });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user, `User ${status === 'suspended' ? 'suspended' : 'status updated'}`);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return error(res, 'role is required', 400);
    const user = await adminService.updateUserRole(req.params.id, role, { adminId: req.user._id, ip: req.ip });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user, 'User role updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page, limit, type, status, userId, from, to } = req.query;
    const data = await adminService.getTransactions({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 30, 100),
      type: type ?? '',
      status: status ?? '',
      userId: userId ?? '',
      from: from ?? '',
      to: to ?? '',
    });
    return success(res, data, 'Transactions fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getTransactionDetail = async (req, res) => {
  try {
    const data = await adminService.getTransactionDetail(req.params.id);
    return success(res, data, 'Transaction fetched');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const getUserTransactions = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await adminService.getUserTransactions(req.params.id, {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });
    return success(res, data, 'Transactions fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getReferralBonusSettings = async (req, res) => {
  try {
    const data = await adminService.getReferralBonusSettings();
    return success(res, data, 'Referral bonus settings fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateReferralBonusSettings = async (req, res) => {
  try {
    const { basic, standard, premium } = req.body;
    const data = await adminService.updateReferralBonusSettings({ basic, standard, premium });
    return success(res, data, 'Referral bonus settings updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getSignupBonusSettings = async (req, res) => {
  try {
    const data = await adminService.getSignupBonusSettings();
    return success(res, data, 'Signup bonus setting fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateSignupBonusSettings = async (req, res) => {
  try {
    const data = await adminService.updateSignupBonusSettings(req.body.amount);
    return success(res, data, 'Signup bonus setting updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getCashbackSettings = async (req, res) => {
  try {
    const data = await adminService.getCashbackSettings();
    return success(res, data, 'Cashback settings fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateCashbackSettings = async (req, res) => {
  try {
    const { customer, agent } = req.body;
    const data = await adminService.updateCashbackSettings({ customer, agent }, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Cashback settings updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getFeatureFlags = async (req, res) => {
  try {
    const data = await adminService.getFeatureFlagsAdmin();
    return success(res, data, 'Feature flags fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateFeatureFlags = async (req, res) => {
  try {
    const data = await adminService.updateFeatureFlagsAdmin(req.body, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Feature flags updated');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getAidapayOverview = async (req, res) => {
  try {
    const data = await adminService.getAidapayOverview();
    return success(res, data, 'AidaPay overview fetched');
  } catch (err) {
    return error(res, err.message, err.statusCode || 502);
  }
};

const getDataPlansAdmin = async (req, res) => {
  try {
    const data = await adminService.getDataPlansAdmin();
    return success(res, data, 'Data plans fetched');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const setDataPlanPrice = async (req, res) => {
  try {
    const { customer, agent } = req.body;
    const data = await adminService.setDataPlanPrice(req.params.planId, { customer, agent }, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Price updated');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const removeDataPlanPrice = async (req, res) => {
  try {
    const data = await adminService.removeDataPlanPrice(req.params.planId, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Price removed — plan hidden from users');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getExamPlansAdmin = async (req, res) => {
  try {
    const data = await adminService.getExamPlansAdmin();
    return success(res, data, 'Exam plans fetched');
  } catch (err) {
    return error(res, err.message, err.statusCode || 500);
  }
};

const setExamPlanPrice = async (req, res) => {
  try {
    const { customer, agent } = req.body;
    const data = await adminService.setExamPlanPrice(req.params.planId, { customer, agent }, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Price updated');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const removeExamPlanPrice = async (req, res) => {
  try {
    const data = await adminService.removeExamPlanPrice(req.params.planId, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Price removed — plan hidden from users');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const sendAnnouncement = async (req, res) => {
  try {
    const { title, body, displayType } = req.body;
    if (!title || !body) return error(res, 'Title and body are required', 400);
    if (!['notification', 'popup'].includes(displayType)) {
      return error(res, 'displayType must be "notification" or "popup"', 400);
    }
    const data = await adminService.sendAnnouncement({ title, body, displayType }, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Announcement sent');
  } catch (err) {
    return error(res, err.message, 400);
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await adminService.getAnnouncements({ page: Number(page) || 1, limit: Math.min(Number(limit) || 20, 50) });
    return success(res, data, 'Announcements fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getStuckDeposits = async (req, res) => {
  try {
    const data = await adminService.getStuckDeposits();
    return success(res, data, 'Stuck deposits fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const reconcileDeposit = async (req, res) => {
  try {
    const data = await adminService.reconcileDeposit(req.params.id, { adminId: req.user._id, ip: req.ip }, req.body?.transactionId);
    return success(res, data, 'Deposit reconciled');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const getPendingWithdrawals = async (req, res) => {
  try {
    const data = await adminService.getPendingWithdrawals();
    return success(res, data, 'Pending withdrawals fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const reconcileWithdrawal = async (req, res) => {
  try {
    const data = await adminService.reconcileWithdrawal(req.params.id, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Withdrawal reconciled');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const approveWithdrawal = async (req, res) => {
  try {
    const data = await adminService.approveWithdrawal(req.params.id, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Withdrawal approved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const rejectWithdrawal = async (req, res) => {
  try {
    const data = await adminService.rejectWithdrawal(req.params.id, req.body.reason, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'Withdrawal rejected');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const getLedger = async (req, res) => {
  try {
    const { page, limit, userId, search } = req.query;
    const data = await adminService.getLedger({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 30, 100),
      userId: userId ?? '',
      search: search ?? '',
    });
    return success(res, data, 'Ledger fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getPendingKyc = async (req, res) => {
  try {
    const data = await adminService.getPendingKyc();
    return success(res, data, 'Pending KYC fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const approveKyc = async (req, res) => {
  try {
    const data = await adminService.approveKyc(req.params.id, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'KYC approved');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const rejectKyc = async (req, res) => {
  try {
    const { reason } = req.body;
    const data = await adminService.rejectKyc(req.params.id, reason, { adminId: req.user._id, ip: req.ip });
    return success(res, data, 'KYC rejected');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
};

const getSavingsLocks = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const data = await adminService.getSavingsLocks({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 30, 100),
      status: status ?? '',
    });
    return success(res, data, 'Savings locks fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getAuditLog = async (req, res) => {
  try {
    const { page, limit, adminId, targetUserId, action } = req.query;
    const data = await adminService.getAuditLog({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 30, 100),
      adminId: adminId ?? '',
      targetUserId: targetUserId ?? '',
      action: action ?? '',
    });
    return success(res, data, 'Audit log fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const exportTransactionsCsv = async (req, res) => {
  try {
    const { type, status, userId, from, to } = req.query;
    const csv = await adminService.exportTransactionsCsv({ type, status, userId, from, to });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const exportUsersCsv = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const csv = await adminService.exportUsersCsv({ search, role, status });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getChartData = async (req, res) => {
  try {
    const data = await adminService.getChartData();
    return success(res, data, 'Chart data fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getTransactions,
  getTransactionDetail,
  getUserTransactions,
  getReferralBonusSettings,
  updateReferralBonusSettings,
  getSignupBonusSettings,
  updateSignupBonusSettings,
  getCashbackSettings,
  updateCashbackSettings,
  getFeatureFlags,
  updateFeatureFlags,
  getStuckDeposits,
  reconcileDeposit,
  getPendingWithdrawals,
  reconcileWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getLedger,
  getPendingKyc,
  approveKyc,
  rejectKyc,
  getSavingsLocks,
  getAuditLog,
  exportTransactionsCsv,
  exportUsersCsv,
  getChartData,
  sendAnnouncement,
  getAnnouncements,
  getAidapayOverview,
  getDataPlansAdmin,
  setDataPlanPrice,
  removeDataPlanPrice,
  getExamPlansAdmin,
  setExamPlanPrice,
  removeExamPlanPrice,
};
