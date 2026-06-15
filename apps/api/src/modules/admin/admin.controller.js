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
    const { status } = req.body;
    if (!status) return error(res, 'status is required', 400);
    const user = await adminService.updateUserStatus(req.params.id, status);
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
    const user = await adminService.updateUserRole(req.params.id, role);
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

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getTransactions,
  getUserTransactions,
};
