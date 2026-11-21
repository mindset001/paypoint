const Transaction = require('../models/Transaction');
const walletService = require('../modules/wallet/wallet.service');
const ledger = require('./ledger.service');
const notify = require('../modules/notifications/notifications.service');
const otp = require('../utils/otp');
const settings = require('./settings.service');

const CASHBACK_SETTING_KEY = 'cashback_rate_by_role';
// Percent of the purchase amount — 0 means off until an admin sets a rate,
// so this never silently starts paying out cashback nobody configured.
const DEFAULT_RATE_BY_ROLE = { customer: 0, agent: 0 };

const getCashbackRates = async () => {
  const stored = await settings.get(CASHBACK_SETTING_KEY);
  return { ...DEFAULT_RATE_BY_ROLE, ...(stored || {}) };
};

const updateCashbackRates = async ({ customer, agent }) => {
  const current = await getCashbackRates();
  const next = {
    customer: customer != null ? Number(customer) : current.customer,
    agent: agent != null ? Number(agent) : current.agent,
  };
  await settings.set(CASHBACK_SETTING_KEY, next);
  return next;
};

// Called (fire-and-forget, like the referral bonus) after a VTU purchase
// succeeds — never blocks or risks the purchase itself. amountKobo is what
// the user was actually charged (the cashback basis).
const creditCashbackIfApplicable = async (userId, role, sourceTransactionId, amountKobo) => {
  const rates = await getCashbackRates();
  const rate = rates[role] ?? 0;
  if (rate <= 0) return;

  const cashbackAmount = Math.round((amountKobo * rate) / 100);
  if (cashbackAmount <= 0) return;

  const { balanceBefore, balanceAfter, wallet } = await walletService.credit(userId, cashbackAmount, null);

  const reference = otp.generateRef();
  const tx = await Transaction.create({
    reference,
    userId,
    walletId: wallet._id,
    type: 'cashback',
    direction: 'credit',
    amount: cashbackAmount,
    status: 'success',
    balanceBefore,
    balanceAfter,
    meta: { sourceTransactionId, cashbackRate: rate, narration: `${rate}% cashback` },
    processedAt: new Date(),
  });

  await ledger.record({
    transactionId: tx._id,
    userId,
    walletId: wallet._id,
    entry: 'credit',
    amount: cashbackAmount,
    balanceBefore,
    balanceAfter,
    description: `Cashback (${rate}%) on purchase`,
  });

  notify.createNotification(userId, {
    title: 'Cashback Earned 🎉',
    body: `You earned ₦${(cashbackAmount / 100).toLocaleString()} cashback on your purchase.`,
    type: 'wallet',
    meta: { reference: tx.reference },
  });
};

module.exports = { getCashbackRates, updateCashbackRates, creditCashbackIfApplicable };
