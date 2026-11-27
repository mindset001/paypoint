const router = require('express').Router();
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const ctrl = require('./admin.controller');

const isAdmin = [authenticate, authorize('admin', 'developer')];

router.get('/stats',                       ...isAdmin, ctrl.getStats);
router.get('/stats/charts',                ...isAdmin, ctrl.getChartData);
router.get('/aidapay/overview',            ...isAdmin, ctrl.getAidapayOverview);
router.get('/esim/overview',               ...isAdmin, ctrl.getEsimOverview);
router.get('/settings/esim-pricing',       ...isAdmin, ctrl.getEsimPricingSettings);
router.patch('/settings/esim-pricing',     ...isAdmin, ctrl.updateEsimPricingSettings);
router.get('/data-plans',                  ...isAdmin, ctrl.getDataPlansAdmin);
router.patch('/data-plans/:planId',        ...isAdmin, ctrl.setDataPlanPrice);
router.delete('/data-plans/:planId',       ...isAdmin, ctrl.removeDataPlanPrice);
router.get('/exam-plans',                  ...isAdmin, ctrl.getExamPlansAdmin);
router.patch('/exam-plans/:planId',        ...isAdmin, ctrl.setExamPlanPrice);
router.delete('/exam-plans/:planId',       ...isAdmin, ctrl.removeExamPlanPrice);
router.get('/users/export',                ...isAdmin, ctrl.exportUsersCsv); // before /users/:id — "export" would otherwise match as an id
router.get('/users',                       ...isAdmin, ctrl.getUsers);
router.get('/users/:id',                   ...isAdmin, ctrl.getUserById);
router.patch('/users/:id/status',          ...isAdmin, ctrl.updateUserStatus);
router.patch('/users/:id/role',            ...isAdmin, ctrl.updateUserRole);
router.get('/users/:id/transactions',      ...isAdmin, ctrl.getUserTransactions);
router.get('/transactions/export',         ...isAdmin, ctrl.exportTransactionsCsv);
router.get('/transactions/:id',            ...isAdmin, ctrl.getTransactionDetail);
router.get('/transactions',                ...isAdmin, ctrl.getTransactions);
router.get('/settings/referral-bonus',     ...isAdmin, ctrl.getReferralBonusSettings);
router.patch('/settings/referral-bonus',   ...isAdmin, ctrl.updateReferralBonusSettings);
router.get('/settings/signup-bonus',       ...isAdmin, ctrl.getSignupBonusSettings);
router.patch('/settings/signup-bonus',     ...isAdmin, ctrl.updateSignupBonusSettings);
router.get('/settings/cashback',           ...isAdmin, ctrl.getCashbackSettings);
router.patch('/settings/cashback',         ...isAdmin, ctrl.updateCashbackSettings);
router.get('/settings/features',           ...isAdmin, ctrl.getFeatureFlags);
router.patch('/settings/features',         ...isAdmin, ctrl.updateFeatureFlags);

router.get('/deposits/stuck',              ...isAdmin, ctrl.getStuckDeposits);
router.post('/deposits/:id/reconcile',     ...isAdmin, ctrl.reconcileDeposit);
router.get('/withdrawals/pending',         ...isAdmin, ctrl.getPendingWithdrawals);
router.post('/withdrawals/:id/reconcile',  ...isAdmin, ctrl.reconcileWithdrawal);
router.post('/withdrawals/:id/approve',    ...isAdmin, ctrl.approveWithdrawal);
router.post('/withdrawals/:id/reject',     ...isAdmin, ctrl.rejectWithdrawal);
router.get('/ledger',                      ...isAdmin, ctrl.getLedger);

router.get('/kyc/pending',                 ...isAdmin, ctrl.getPendingKyc);
router.post('/kyc/:id/approve',            ...isAdmin, ctrl.approveKyc);
router.post('/kyc/:id/reject',             ...isAdmin, ctrl.rejectKyc);

router.get('/savings',                     ...isAdmin, ctrl.getSavingsLocks);
router.get('/audit-log',                   ...isAdmin, ctrl.getAuditLog);

router.get('/announcements',               ...isAdmin, ctrl.getAnnouncements);
router.post('/announcements',              ...isAdmin, ctrl.sendAnnouncement);

module.exports = router;
