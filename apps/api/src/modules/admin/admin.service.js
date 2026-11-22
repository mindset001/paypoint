const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const Ledger = require('../../models/Ledger');
const SavingsLock = require('../../models/SavingsLock');
const referralService = require('../referral/referral.service');
const walletService = require('../wallet/wallet.service');
const Paystack = require('../../providers/paystack/paystack.client');
const AidaPay = require('../../providers/aidapay/aidapay.client');
const aidapayMonitor = require('../../services/aidapayMonitor.service');
const audit = require('../../services/audit.service');
const cashbackService = require('../../services/cashback.service');
const featureFlags = require('../../services/featureFlags.service');
const Notification = require('../../models/Notification');
const Announcement = require('../../models/Announcement');
const dataService = require('../vtu/data/data.service');
const dataPlanPricing = require('../../services/dataPlanPricing.service');

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

const updateUserStatus = async (id, status, { adminId, reason, ip } = {}) => {
  const allowed = ['active', 'suspended', 'pending_kyc'];
  if (!allowed.includes(status)) throw new Error('Invalid status');
  const before = await User.findById(id).select('status');
  if (!before) return null;
  const updated = await User.findByIdAndUpdate(id, { status }, { new: true }).select('firstName lastName status');
  audit.record({
    adminId, action: 'user.status.update', targetUserId: id,
    before: { status: before.status }, after: { status }, reason, ip,
  });
  return updated;
};

const updateUserRole = async (id, role, { adminId, ip } = {}) => {
  const allowed = ['customer', 'agent', 'sub_agent', 'admin', 'developer'];
  if (!allowed.includes(role)) throw new Error('Invalid role');
  const before = await User.findById(id).select('role');
  if (!before) return null;
  const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('firstName lastName role');
  audit.record({
    adminId, action: 'user.role.update', targetUserId: id,
    before: { role: before.role }, after: { role }, ip,
  });
  return updated;
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

// ── Cashback & feature flags ─────────────────────────────────────────────

const getCashbackSettings = async () => cashbackService.getCashbackRates();

const updateCashbackSettings = async ({ customer, agent }, { adminId, ip } = {}) => {
  const before = await cashbackService.getCashbackRates();
  const after = await cashbackService.updateCashbackRates({ customer, agent });
  audit.record({ adminId, action: 'settings.cashback.update', before, after, ip });
  return after;
};

const getFeatureFlagsAdmin = async () => featureFlags.getFlags();

const updateFeatureFlagsAdmin = async (partial, { adminId, ip } = {}) => {
  const before = await featureFlags.getFlags();
  const after = await featureFlags.updateFlags(partial);
  audit.record({ adminId, action: 'settings.features.update', before, after, ip });
  return after;
};

// ── AidaPay provider account ─────────────────────────────────────────────
//
// The VTU wallet AidaPay debits for every airtime/data/cable/electricity
// purchase — surfaced so admins can see it's running low before it starts
// failing live purchases. AidaPay returns balances in naira; converted to
// kobo here so the frontend can reuse formatNGN() like everywhere else.

const getAidapayOverview = async () => {
  const res = await AidaPay.getAccountInfo();
  const d = res.data?.data ?? {};
  return {
    name: d.names ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    balance: Math.round((d.balance ?? 0) * 100),
    commissionBalance: Math.round((d.commission_balance ?? 0) * 100),
    lowBalanceThreshold: aidapayMonitor.LOW_BALANCE_KOBO,
  };
};

// ── Data plan pricing ─────────────────────────────────────────────────────
//
// Users never see AidaPay's raw cost directly — only plans an admin has
// explicitly priced show up for purchase (data.service.js#getPlans). This
// surfaces every AidaPay plan across every known network/catalog, merged
// with whatever price (if any) is currently set, so admin can see and price
// the full live catalog in one place.

const getDataPlansAdmin = async () => {
  const combos = dataService.getAllNetworkCatalogs();
  const allPrices = await dataPlanPricing.getAllPrices();

  return Promise.all(combos.map(async ({ network, catalogKey, catalogLabel }) => {
    const plans = await dataService.getRawPlans(network, catalogKey);
    return {
      network,
      catalogKey,
      catalogLabel,
      plans: plans.map((p) => {
        const entry = allPrices[p.planId];
        return {
          ...p,
          customerPrice: entry?.customer != null ? entry.customer / 100 : null,
          agentPrice: entry?.agent != null ? entry.agent / 100 : null,
        };
      }),
    };
  }));
};

const setDataPlanPrice = async (planId, { customer, agent }, { adminId, ip } = {}) => {
  if (customer == null || agent == null || Number(customer) < 0 || Number(agent) < 0) {
    throw Object.assign(new Error('Both customer and reseller prices are required and must be non-negative'), { statusCode: 400 });
  }
  const before = (await dataPlanPricing.getAllPrices())[planId] ?? null;
  const after = await dataPlanPricing.setPrice(planId, { customer: Number(customer) * 100, agent: Number(agent) * 100 });
  audit.record({ adminId, action: 'data_plan.price.update', before, after: { planId, ...after }, ip });
  return { planId, customerPrice: after.customer / 100, agentPrice: after.agent / 100 };
};

const removeDataPlanPrice = async (planId, { adminId, ip } = {}) => {
  const before = (await dataPlanPricing.getAllPrices())[planId] ?? null;
  await dataPlanPricing.removePrice(planId);
  audit.record({ adminId, action: 'data_plan.price.remove', before, after: { planId }, ip });
  return { planId };
};

// ── Broadcasts ─────────────────────────────────────────────────────────
//
// Fans out a Notification to every non-suspended user, then logs the send
// itself as an Announcement so admins have a history separate from the
// (much larger, per-user) Notification collection. displayType 'popup'
// flags it in Notification.meta so the dashboard shows it as a blocking
// modal on next load instead of just sitting in the bell icon's list.

const sendAnnouncement = async ({ title, body, displayType }, { adminId, ip } = {}) => {
  const users = await User.find({ status: { $ne: 'suspended' } }, '_id');
  const docs = users.map((u) => ({
    userId: u._id,
    title,
    body,
    type: 'promo',
    meta: { broadcast: true, displayType },
  }));
  if (docs.length) await Notification.insertMany(docs);

  const announcement = await Announcement.create({
    title, body, displayType, sentBy: adminId, recipientCount: docs.length,
  });
  audit.record({ adminId, action: 'announcement.send', after: { title, displayType, recipientCount: docs.length }, ip });
  return announcement;
};

const getAnnouncements = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Announcement.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sentBy', 'firstName lastName'),
    Announcement.countDocuments(),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
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
const reconcileDeposit = async (txId, { adminId, ip } = {}) => {
  const tx = await Transaction.findById(txId);
  if (!tx) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  if (tx.type !== 'wallet_fund') throw Object.assign(new Error('Not a deposit transaction'), { statusCode: 400 });
  if (tx.status !== 'pending') return { outcome: 'already_processed', status: tx.status };

  try {
    const result = await walletService.verifyPayment(tx.meta?.provider, tx.reference);
    audit.record({
      adminId, action: 'deposit.reconcile', targetUserId: tx.userId, targetTransactionId: tx._id,
      before: { status: 'pending' }, after: { status: 'success' }, ip,
    });
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
const reconcileWithdrawal = async (txId, { adminId, ip } = {}) => {
  const tx = await Transaction.findById(txId);
  if (!tx) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  if (tx.type !== 'withdrawal') throw Object.assign(new Error('Not a withdrawal transaction'), { statusCode: 400 });
  if (tx.status !== 'pending') return { outcome: 'already_processed', status: tx.status };
  if (!tx.providerReference) return { outcome: 'no_provider_reference' };

  const result = await Paystack.verifyTransfer(tx.providerReference);
  const status = result.data?.status;

  if (status === 'success') {
    await walletService.handlePaystackWebhook({ event: 'transfer.success', data: { reference: tx.reference, status } });
    audit.record({
      adminId, action: 'withdrawal.reconcile', targetUserId: tx.userId, targetTransactionId: tx._id,
      before: { status: 'pending' }, after: { status: 'success' }, ip,
    });
    return { outcome: 'completed', status };
  }
  if (status === 'failed' || status === 'reversed') {
    await walletService.handlePaystackWebhook({ event: `transfer.${status}`, data: { reference: tx.reference, status } });
    audit.record({
      adminId, action: 'withdrawal.reconcile', targetUserId: tx.userId, targetTransactionId: tx._id,
      before: { status: 'pending' }, after: { status: 'failed', refunded: true }, ip,
    });
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

// ── KYC review ────────────────────────────────────────────────────────────
//
// Dojah auto-approves on a name match (see auth.service.js submitKyc); this
// is the manual-review queue for the ones it couldn't — an admin needs to
// see the name mismatch itself, not just a flag, to make the call.

const getPendingKyc = async () => {
  const users = await User.find({ status: 'pending_kyc', 'kyc.submittedAt': { $ne: null } })
    .select('firstName lastName email phone kyc.submittedAt kyc.verifiedName kyc.rejectionReason')
    .select('+kyc.nin +kyc.bvn +kyc.phoneNumber')
    .sort({ 'kyc.submittedAt': 1 });

  return users.map((u) => ({
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email?.address,
    phone: u.phone?.number,
    submittedAt: u.kyc.submittedAt,
    verifiedName: u.kyc.verifiedName,
    idType: u.kyc.nin ? 'NIN' : u.kyc.bvn ? 'BVN' : u.kyc.phoneNumber ? 'Phone Number' : null,
    idLast4: (u.kyc.nin || u.kyc.bvn || u.kyc.phoneNumber || '').slice(-4),
    priorRejectionReason: u.kyc.rejectionReason,
  }));
};

const approveKyc = async (id, { adminId, ip } = {}) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  user.status = 'active';
  user.kyc.verifiedAt = new Date();
  await user.save();
  audit.record({
    adminId, action: 'kyc.approve', targetUserId: id,
    before: { status: 'pending_kyc' }, after: { status: 'active' }, ip,
  });
  return { id: user._id, status: user.status };
};

const rejectKyc = async (id, reason, { adminId, ip } = {}) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  // Leaves status at pending_kyc (there's no "kyc_rejected" state) but
  // clears submittedAt so this drops out of the review queue until the
  // user resubmits via /auth/kyc, which always sets submittedAt again.
  user.kyc.submittedAt = undefined;
  user.kyc.rejectionReason = reason || 'Name on ID does not match account';
  await user.save();
  audit.record({
    adminId, action: 'kyc.reject', targetUserId: id,
    before: { status: 'pending_kyc' }, after: { status: 'pending_kyc', rejectionReason: user.kyc.rejectionReason }, reason, ip,
  });
  return { id: user._id, status: user.status };
};

// ── Savings visibility ──────────────────────────────────────────────────

const getSavingsLocks = async ({ page = 1, limit = 30, status = '' } = {}) => {
  const skip = (page - 1) * limit;
  const filter = {};
  if (status) filter.status = status;

  const [locks, total, totalLockedAgg] = await Promise.all([
    SavingsLock.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('userId', 'firstName lastName email phone'),
    SavingsLock.countDocuments(filter),
    SavingsLock.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    locks, total, page, limit, pages: Math.ceil(total / limit),
    totalLockedActive: totalLockedAgg[0]?.total ?? 0,
  };
};

// ── Audit log ─────────────────────────────────────────────────────────────

const getAuditLog = async ({ page = 1, limit = 30, adminId = '', targetUserId = '', action = '' } = {}) => {
  const AuditLog = require('../../models/AuditLog');
  const skip = (page - 1) * limit;
  const filter = {};
  if (adminId) filter.adminId = adminId;
  if (targetUserId) filter.targetUserId = targetUserId;
  if (action) filter.action = action;

  const [entries, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('adminId', 'firstName lastName email')
      .populate('targetUserId', 'firstName lastName email')
      .populate('targetTransactionId', 'reference type'),
    AuditLog.countDocuments(filter),
  ]);

  return { entries, total, page, limit, pages: Math.ceil(total / limit) };
};

// ── CSV export ────────────────────────────────────────────────────────────

const EXPORT_ROW_CAP = 20000;

const toCsv = (rows, columns) => {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => esc(c.value(row))).join(',')).join('\n');
  return `${header}\n${body}`;
};

const exportTransactionsCsv = async ({ type = '', status = '', userId = '', from = '', to = '' } = {}) => {
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).limit(EXPORT_ROW_CAP)
    .populate('userId', 'firstName lastName email phone')
    .select('reference type direction amount status balanceBefore balanceAfter failureReason createdAt');

  return toCsv(transactions, [
    { label: 'Date', value: (t) => t.createdAt.toISOString() },
    { label: 'Reference', value: (t) => t.reference },
    { label: 'User', value: (t) => t.userId ? `${t.userId.firstName} ${t.userId.lastName}` : '' },
    { label: 'Email', value: (t) => t.userId?.email?.address ?? '' },
    { label: 'Phone', value: (t) => t.userId?.phone?.number ?? '' },
    { label: 'Type', value: (t) => t.type },
    { label: 'Direction', value: (t) => t.direction },
    { label: 'Amount (NGN)', value: (t) => (t.amount / 100).toFixed(2) },
    { label: 'Status', value: (t) => t.status },
    { label: 'Balance Before (NGN)', value: (t) => (t.balanceBefore / 100).toFixed(2) },
    { label: 'Balance After (NGN)', value: (t) => (t.balanceAfter / 100).toFixed(2) },
    { label: 'Failure Reason', value: (t) => t.failureReason ?? '' },
  ]);
};

const exportUsersCsv = async ({ search = '', role = '', status = '' } = {}) => {
  const filter = {};
  if (search) {
    const re = new RegExp(search, 'i');
    filter.$or = [
      { firstName: re }, { lastName: re }, { 'email.address': re }, { 'phone.number': re }, { referralCode: re },
    ];
  }
  if (role) filter.role = role;
  if (status) filter.status = status;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(EXPORT_ROW_CAP)
    .select('firstName lastName email phone role status referralCode createdAt');
  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } }).select('userId balance');
  const walletMap = Object.fromEntries(wallets.map((w) => [w.userId.toString(), w.balance]));

  return toCsv(users, [
    { label: 'Name', value: (u) => `${u.firstName} ${u.lastName}` },
    { label: 'Email', value: (u) => u.email?.address ?? '' },
    { label: 'Phone', value: (u) => u.phone?.number ?? '' },
    { label: 'Role', value: (u) => u.role },
    { label: 'Status', value: (u) => u.status },
    { label: 'Wallet Balance (NGN)', value: (u) => ((walletMap[u._id.toString()] ?? 0) / 100).toFixed(2) },
    { label: 'Referral Code', value: (u) => u.referralCode },
    { label: 'Joined', value: (u) => u.createdAt.toISOString() },
  ]);
};

// ── Dashboard charts ──────────────────────────────────────────────────────

const CHART_DAYS = 30;

const getChartData = async () => {
  const since = new Date();
  since.setDate(since.getDate() - CHART_DAYS);
  since.setHours(0, 0, 0, 0);

  const [dailyVolume, providerBreakdown, dailyActiveUsers] = await Promise.all([
    Transaction.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, status: '$status' },
        count: { $sum: 1 },
        volume: { $sum: '$amount' },
      } },
      { $sort: { '_id.date': 1 } },
    ]),

    Transaction.aggregate([
      { $match: { createdAt: { $gte: since }, type: 'wallet_fund', status: 'success' } },
      { $group: { _id: '$meta.provider', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
    ]),

    Transaction.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        users: { $addToSet: '$userId' },
      } },
      { $project: { date: '$_id', count: { $size: '$users' } } },
      { $sort: { date: 1 } },
    ]),
  ]);

  // Collapse the per-status daily buckets into one row per day with
  // success/failed/pending counts and success volume, for a stacked chart.
  const byDate = {};
  for (const { _id, count, volume } of dailyVolume) {
    const d = (byDate[_id.date] ??= { date: _id.date, success: 0, failed: 0, pending: 0, volume: 0 });
    d[_id.status] = (d[_id.status] ?? 0) + count;
    if (_id.status === 'success') d.volume += volume;
  }

  return {
    dailyVolume: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    providerBreakdown: providerBreakdown.map((p) => ({ provider: p._id ?? 'unknown', count: p.count, volume: p.volume })),
    dailyActiveUsers: dailyActiveUsers.map((d) => ({ date: d.date, count: d.count })),
  };
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
  getCashbackSettings,
  updateCashbackSettings,
  getFeatureFlagsAdmin,
  updateFeatureFlagsAdmin,
  getStuckDeposits,
  reconcileDeposit,
  getPendingWithdrawals,
  reconcileWithdrawal,
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
};
