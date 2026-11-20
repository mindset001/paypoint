const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const Ledger = require('../../models/Ledger');
const referralService = require('../referral/referral.service');
const walletService = require('../wallet/wallet.service');
const Paystack = require('../../providers/paystack/paystack.client');

// A wallet_fund past this age that's still "pending" means the webhook
// never arrived and nobody completed the browser-side verify call either —
// worth surfacing to an admin instead of staying stuck forever.
const STUCK_DEPOSIT_AGE_MS = 15 * 60 * 1000;

const getStats = async () => {
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userCounts, txStats, dailyTx, weeklyTx, monthlyTx, recentUsers] = await Promise.all([
    // User counts by status
    User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // All-time transaction stats by status
    Transaction.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        volume: { $sum: '$amount' },
        margin: { $sum: { $ifNull: ['$meta.marginAmount', 0] } },
      }},
    ]),

    // Today's transactions
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, status: 'success' } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$amount' }, margin: { $sum: { $ifNull: ['$meta.marginAmount', 0] } } } },
    ]),

    // This week's transactions
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfWeek }, status: 'success' } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$amount' }, margin: { $sum: { $ifNull: ['$meta.marginAmount', 0] } } } },
    ]),

    // This month's transactions
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: 'success' } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$amount' }, margin: { $sum: { $ifNull: ['$meta.marginAmount', 0] } } } },
    ]),

    // 5 most recent users
    User.find().sort({ createdAt: -1 }).limit(5)
      .select('firstName lastName email phone role status createdAt'),
  ]);

  const byStatus = Object.fromEntries(userCounts.map(({ _id, count }) => [_id, count]));
  const txByStatus = Object.fromEntries(txStats.map(({ _id, count, volume, margin }) => [_id, { count, volume, margin }]));

  return {
    users: {
      total: Object.values(byStatus).reduce((s, c) => s + c, 0),
      active: byStatus.active ?? 0,
      suspended: byStatus.suspended ?? 0,
      pendingKyc: byStatus.pending_kyc ?? 0,
    },
    transactions: {
      allTime: {
        success: txByStatus.success?.count ?? 0,
        failed:  txByStatus.failed?.count  ?? 0,
        pending: txByStatus.pending?.count ?? 0,
        volume:  txByStatus.success?.volume ?? 0,
        margin:  txByStatus.success?.margin ?? 0,
      },
      today:  { count: dailyTx[0]?.count ?? 0,   volume: dailyTx[0]?.volume ?? 0,   margin: dailyTx[0]?.margin ?? 0 },
      week:   { count: weeklyTx[0]?.count ?? 0,  volume: weeklyTx[0]?.volume ?? 0,  margin: weeklyTx[0]?.margin ?? 0 },
      month:  { count: monthlyTx[0]?.count ?? 0, volume: monthlyTx[0]?.volume ?? 0, margin: monthlyTx[0]?.margin ?? 0 },
    },
    recentUsers,
  };
};

const getUsers = async ({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) => {
  const skip = (page - 1) * limit;
  const filter = {};

  if (search) {
    const re = new RegExp(search, 'i');
    filter.$or = [
      { firstName: re },
      { lastName: re },
      { 'email.address': re },
      { 'phone.number': re },
      { referralCode: re },
    ];
  }
  if (role)   filter.role   = role;
  if (status) filter.status = status;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select('firstName lastName email phone role status referralCode createdAt lastLoginAt'),
    User.countDocuments(filter),
  ]);

  // Attach wallet balances
  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } }).select('userId balance tier');
  const walletMap = Object.fromEntries(wallets.map((w) => [w.userId.toString(), w]));

  const enriched = users.map((u) => {
    const w = walletMap[u._id.toString()];
    return { ...u.toObject(), wallet: w ? { balance: w.balance, tier: w.tier } : null };
  });

  return { users: enriched, total, page, limit, pages: Math.ceil(total / limit) };
};

const getUserById = async (id) => {
  const [user, wallet, recentTx] = await Promise.all([
    User.findById(id).select('firstName lastName email phone role status referralCode referredBy twoFactorEnabled lastLoginAt lastLoginIp createdAt'),
    Wallet.findOne({ userId: id }).select('balance tier dailySpendLimit totalFunded totalSpent frozenAmount'),
    Transaction.find({ userId: id }).sort({ createdAt: -1 }).limit(10)
      .select('reference type direction amount status createdAt meta failureReason'),
  ]);
  if (!user) return null;
  return { user, wallet, recentTx };
};

const updateUserStatus = async (id, status) => {
  const allowed = ['active', 'suspended', 'pending_kyc'];
  if (!allowed.includes(status)) throw new Error('Invalid status');
  return User.findByIdAndUpdate(id, { status }, { new: true }).select('firstName lastName status');
};

const updateUserRole = async (id, role) => {
  const allowed = ['customer', 'agent', 'sub_agent', 'admin', 'developer'];
  if (!allowed.includes(role)) throw new Error('Invalid role');
  return User.findByIdAndUpdate(id, { role }, { new: true }).select('firstName lastName role');
};

const getTransactions = async ({ page = 1, limit = 30, type = '', status = '', userId = '', from = '', to = '' } = {}) => {
  const skip = (page - 1) * limit;
  const filter = {};

  if (type)   filter.type   = type;
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('userId', 'firstName lastName phone')
      .select('reference type direction amount status balanceBefore balanceAfter meta failureReason providerReference createdAt processedAt'),
    Transaction.countDocuments(filter),
  ]);

  return { transactions, total, page, limit, pages: Math.ceil(total / limit) };
};

const getUserTransactions = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select('reference type direction amount status meta failureReason createdAt'),
    Transaction.countDocuments({ userId }),
  ]);
  return { transactions, total, page, limit, pages: Math.ceil(total / limit) };
};

const getReferralBonusSettings = async () => {
  const byTierKobo = await referralService.getBonusByTier();
  return {
    basic: byTierKobo.basic / 100,
    standard: byTierKobo.standard / 100,
    premium: byTierKobo.premium / 100,
  };
};

const updateReferralBonusSettings = async ({ basic, standard, premium }) => {
  const updatedKobo = await referralService.updateBonusByTier({ basic, standard, premium });
  return {
    basic: updatedKobo.basic / 100,
    standard: updatedKobo.standard / 100,
    premium: updatedKobo.premium / 100,
  };
};

// ── Financial reconciliation ─────────────────────────────────────────────
//
// These exist because completion of a deposit/withdrawal normally happens
// automatically (provider webhook, or the browser-side verify call after
// checkout redirects back) — this is the manual fallback for when neither
// one fires, so an admin doesn't have to reach for a one-off DB script.

const getStuckDeposits = async () => {
  const cutoff = new Date(Date.now() - STUCK_DEPOSIT_AGE_MS);
  const deposits = await Transaction.find({
    type: 'wallet_fund',
    status: 'pending',
    createdAt: { $lt: cutoff },
  })
    .sort({ createdAt: 1 }) // oldest first — longest-stuck is most urgent
    .populate('userId', 'firstName lastName email phone')
    .select('reference userId amount meta createdAt');
  return deposits;
};

// Re-runs the same provider-verify + completion logic the browser-side
// /wallet/fund/verify call would have run — safe to call repeatedly
// (completeWalletFund only ever claims a still-pending row once).
const reconcileDeposit = async (txId) => {
  const tx = await Transaction.findById(txId);
  if (!tx) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  if (tx.type !== 'wallet_fund') throw Object.assign(new Error('Not a deposit transaction'), { statusCode: 400 });
  if (tx.status !== 'pending') return { outcome: 'already_processed', status: tx.status };

  try {
    const result = await walletService.verifyPayment(tx.meta?.provider, tx.reference);
    return { outcome: 'credited', ...result };
  } catch (err) {
    // The provider genuinely hasn't marked this successful (yet, or ever) —
    // that's a normal, expected outcome here, not a server error.
    return { outcome: 'not_successful', message: err.message };
  }
};

const getPendingWithdrawals = async () => {
  const withdrawals = await Transaction.find({ type: 'withdrawal', status: 'pending' })
    .sort({ createdAt: 1 })
    .populate('userId', 'firstName lastName email phone')
    .select('reference userId amount meta providerReference providerStatus createdAt');
  return withdrawals;
};

// Paystack transfers left "pending"/"otp" resolve via the business
// account's own approval, then a transfer.success/failed/reversed webhook —
// this re-checks that status directly for when the webhook never arrived.
const reconcileWithdrawal = async (txId) => {
  const tx = await Transaction.findById(txId);
  if (!tx) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  if (tx.type !== 'withdrawal') throw Object.assign(new Error('Not a withdrawal transaction'), { statusCode: 400 });
  if (tx.status !== 'pending') return { outcome: 'already_processed', status: tx.status };
  if (!tx.providerReference) return { outcome: 'no_provider_reference' };

  const result = await Paystack.verifyTransfer(tx.providerReference);
  const status = result.data?.status;

  if (status === 'success') {
    await walletService.handlePaystackWebhook({ event: 'transfer.success', data: { reference: tx.reference, status } });
    return { outcome: 'completed', status };
  }
  if (status === 'failed' || status === 'reversed') {
    await walletService.handlePaystackWebhook({ event: `transfer.${status}`, data: { reference: tx.reference, status } });
    return { outcome: 'refunded', status };
  }
  return { outcome: 'still_pending', status };
};

const getLedger = async ({ page = 1, limit = 30, userId = '', search = '' } = {}) => {
  const skip = (page - 1) * limit;
  const filter = {};
  if (userId) filter.userId = userId;
  if (search) filter.description = new RegExp(search, 'i');

  const [entries, total] = await Promise.all([
    Ledger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('userId', 'firstName lastName phone')
      .populate('transactionId', 'reference type status'),
    Ledger.countDocuments(filter),
  ]);

  return { entries, total, page, limit, pages: Math.ceil(total / limit) };
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getTransactions,
  getUserTransactions,
  getReferralBonusSettings,
  updateReferralBonusSettings,
  getStuckDeposits,
  reconcileDeposit,
  getPendingWithdrawals,
  reconcileWithdrawal,
  getLedger,
};
