const mongoose = require('mongoose');
const Referral = require('../../models/Referral');
const Transaction = require('../../models/Transaction');
const Wallet = require('../../models/Wallet');
const walletService = require('../wallet/wallet.service');
const ledger = require('../../services/ledger.service');
const settings = require('../../services/settings.service');
const otp = require('../../utils/otp');
const notify = require('../notifications/notifications.service');

const BONUS_SETTING_KEY = 'referral_bonus_by_tier';
const DEFAULT_BONUS_BY_TIER = { basic: 10000, standard: 15000, premium: 25000 }; // kobo

const getBonusByTier = async () => {
  const stored = await settings.get(BONUS_SETTING_KEY);
  return { ...DEFAULT_BONUS_BY_TIER, ...(stored || {}) };
};

const getBonusAmountForTier = async (tier) => {
  const byTier = await getBonusByTier();
  return byTier[tier] ?? DEFAULT_BONUS_BY_TIER.basic;
};

const updateBonusByTier = async ({ basic, standard, premium }) => {
  const current = await getBonusByTier();
  const next = {
    basic: basic != null ? Math.round(basic * 100) : current.basic,
    standard: standard != null ? Math.round(standard * 100) : current.standard,
    premium: premium != null ? Math.round(premium * 100) : current.premium,
  };
  await settings.set(BONUS_SETTING_KEY, next);
  return next;
};

// ── Called at signup when a valid referral code was used ──────────────

const createPendingReferral = async (referrerId, refereeId, referralCode) => {
  try {
    await Referral.create({ referrerId, refereeId, referralCode });
  } catch (err) {
    console.error('[referral] failed to create pending referral:', err.message);
  }
};

// ── Called after a VTU purchase succeeds ───────────────────────────────

const creditReferralBonusIfQualifying = async (refereeId, transactionId, attempt = 1) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const referral = await Referral.findOneAndUpdate(
      { refereeId, status: 'pending' },
      { status: 'completed', qualifyingTransactionId: transactionId, completedAt: new Date() },
      { session, new: true }
    );

    if (!referral) {
      await session.abortTransaction();
      return;
    }

    const referrerWallet = await Wallet.findOne({ userId: referral.referrerId }).session(session);
    const bonusAmount = await getBonusAmountForTier(referrerWallet?.tier ?? 'basic');

    const { balanceBefore, balanceAfter, wallet } = await walletService.credit(
      referral.referrerId,
      bonusAmount,
      session
    );

    const ref = otp.generateRef();
    const [tx] = await Transaction.create([{
      reference: ref,
      userId: referral.referrerId,
      walletId: wallet._id,
      type: 'referral_bonus',
      direction: 'credit',
      amount: bonusAmount,
      status: 'success',
      balanceBefore,
      balanceAfter,
      meta: { refereeId, narration: 'Referral bonus' },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id,
      userId: referral.referrerId,
      walletId: wallet._id,
      entry: 'credit',
      amount: bonusAmount,
      balanceBefore,
      balanceAfter,
      description: 'Referral bonus — referee completed first transaction',
    }, session);

    referral.bonusAmount = bonusAmount;
    await referral.save({ session });

    await session.commitTransaction();

    notify.createNotification(referral.referrerId, {
      title: 'Referral Bonus 🎉',
      body: `You earned ₦${(bonusAmount / 100).toLocaleString()} because your referral made their first transaction.`,
      type: 'wallet',
      meta: { referralId: referral._id },
    });
  } catch (err) {
    await session.abortTransaction();
    if (err.errorLabels?.includes('TransientTransactionError') && attempt < 3) {
      return creditReferralBonusIfQualifying(refereeId, transactionId, attempt + 1);
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ── User-facing reads ───────────────────────────────────────────────────

const getStats = async (userId) => {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('referralCode');

  const [totalReferred, completed, pending, earnedAgg] = await Promise.all([
    Referral.countDocuments({ referrerId: userId }),
    Referral.countDocuments({ referrerId: userId, status: 'completed' }),
    Referral.countDocuments({ referrerId: userId, status: 'pending' }),
    Referral.aggregate([
      { $match: { referrerId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$bonusAmount' } } },
    ]),
  ]);

  const totalEarnedKobo = earnedAgg[0]?.total ?? 0;

  return {
    referralCode: user?.referralCode ?? null,
    totalReferred,
    completed,
    pending,
    totalEarnedNGN: totalEarnedKobo / 100,
  };
};

const getHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const query = { referrerId: userId };
  const skip = (page - 1) * limit;
  const [referrals, total] = await Promise.all([
    Referral.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('refereeId', 'firstName lastName'),
    Referral.countDocuments(query),
  ]);
  return { referrals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

module.exports = {
  createPendingReferral,
  getBonusAmountForTier,
  getBonusByTier,
  updateBonusByTier,
  creditReferralBonusIfQualifying,
  getStats,
  getHistory,
};
