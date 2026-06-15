const router = require('express').Router();
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const ctrl = require('./admin.controller');

const isAdmin = [authenticate, authorize('admin', 'developer')];

router.get('/stats',                       ...isAdmin, ctrl.getStats);
router.get('/users',                       ...isAdmin, ctrl.getUsers);
router.get('/users/:id',                   ...isAdmin, ctrl.getUserById);
router.patch('/users/:id/status',          ...isAdmin, ctrl.updateUserStatus);
router.patch('/users/:id/role',            ...isAdmin, ctrl.updateUserRole);
router.get('/users/:id/transactions',      ...isAdmin, ctrl.getUserTransactions);
router.get('/transactions',                ...isAdmin, ctrl.getTransactions);

module.exports = router;
