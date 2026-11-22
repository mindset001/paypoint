const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const referralService = require('../../referral/referral.service');
const cashbackService = require('../../../services/cashback.service');
const pricing = require('../../../services/pricing.service');
const examPlanPricing = require('../../../services/examPlanPricing.service');

// AidaPay has no dedicated "exam types" endpoint — exam boards are listed
// as providers under the generic education service slug. Verified live:
// a provider's min_amount/max_amount are just generic bounds, NOT its real
// price — e.g. WAEC Registration shows min_amount: 100 even though its one
// real package (WASSCE PIN for Private Candidates) costs ₦37,500. The real
// price only exists on that provider's packages, same shape as data/cable.

// Admin-only: every package AidaPay offers across every exam provider,
// with raw cost — not gated by admin pricing, used to build the pricing UI
// where unpriced plans still need to show up so admin can price them.
const getRawPlans = async () => {
  const result = await AidaPay.getProviders(AidaPay.SLUGS.exam);
  const providers = result.data?.data ?? [];
  const perProvider = await Promise.all(providers.map(async (p) => {
    const pkgResult = await AidaPay.getPackages(p.provider_code);
    const packages = pkgResult.data?.data ?? [];
    return packages.map((pkg) => ({
      planId: pkg.package_api_code,
      name: pkg.package_name,
      rawAmount: Number(pkg.package_amount),
      providerCode: p.provider_code,
      providerName: p.provider_name,
    }));
  }));
  return perProvider.flat();
};

// Customer-facing: AidaPay's raw cost is never shown or charged directly —
// only plans an admin has explicitly priced (see examPlanPricing.service.js)
// are returned here, at that admin-set price. A plan with no admin-set
// price stays invisible until someone reviews and prices it.
const getPlans = async (user) => {
  const raw = await getRawPlans();
  const allPrices = await examPlanPricing.getAllPrices();
  const reseller = pricing.isReseller(user);

  return raw
    .map((p) => {
      const entry = allPrices[p.planId];
      const priceKobo = entry ? (reseller ? entry.agent : entry.customer) : null;
      if (priceKobo == null) return null;
      return {
        planId: p.planId,
        name: p.name,
        providerName: p.providerName,
        amount: priceKobo / 100,
      };
    })
    .filter(Boolean);
};

const buy = async (userId, { planId, quantity = 1, pin }) => {
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    throw Object.assign(new Error('Quantity must be between 1 and 10'), { statusCode: 400 });
  }

  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid PIN'), { statusCode: 403 });

  const raw = await getRawPlans();
  const plan = raw.find((p) => p.planId === planId);
  if (!plan) throw Object.assign(new Error('Exam plan not found'), { statusCode: 404 });

  // Never trust a client-supplied amount for what to charge — look up the
  // admin-set price directly, same as data/cable pricing.
  const unitPriceKobo = await examPlanPricing.getPriceKobo(planId, pricing.isReseller(user));
  if (unitPriceKobo == null) {
    throw Object.assign(new Error('This exam PIN is not currently available'), { statusCode: 400 });
  }
  const amountKobo = unitPriceKobo * qty;

  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();
    [tx] = await Transaction.create([{
      reference: ref, userId, walletId: wallet._id,
      type: 'exam', direction: 'debit', amount: amountKobo, status: 'pending',
      balanceBefore, balanceAfter,
      meta: { examPlan: planId, quantity: qty, marginAmount: amountKobo - Math.round(plan.rawAmount * qty * 100) },
      processedAt: new Date(),
    }], { session });
    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${plan.name} x${qty}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }

  try {
    // AidaPay's documented /buy body has no quantity/batch field — this
    // calls /buy once per PIN using the account holder's own phone as the
    // recipient, same loop pattern already used before this rewrite.
    const pins = [];
    const hashes = [];
    for (let i = 0; i < qty; i++) {
      const unitRef = qty > 1 ? `${tx.reference}-${i + 1}` : tx.reference;
      const result = await AidaPay.buy({ recipient: user.phone.number, providerCode: plan.providerCode, ref: unitRef, packageCode: planId });
      const txn = result.data?.data?.transaction_data;
      hashes.push(txn?.transaction_hash);
      if (txn?.pin) pins.push(txn.pin);

      const charged = Number(txn?.amount_paid ?? txn?.amount);
      if (Number.isFinite(charged) && Math.abs(charged - plan.rawAmount) > 0.5) {
        console.error(`[aidapay] price mismatch on exam ${planId} ${unitRef}: expected raw ₦${plan.rawAmount}, AidaPay charged ₦${charged}`);
      }
    }

    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'success',
      providerReference: hashes[0],
      'meta.examPin': pins[0],
    });
    referralService.creditReferralBonusIfQualifying(userId, tx._id)
      .catch((err) => console.error('[referral]', err));
    cashbackService.creditCashbackIfApplicable(userId, user.role, tx._id, amountKobo)
      .catch((err) => console.error('[cashback]', err));
    return { message: 'Exam PIN purchased', reference: tx.reference, pin: pins[0], pins };
  } catch (providerErr) {
    const { balanceBefore: revBefore, balanceAfter: revAfter } = await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message, balanceAfter: revAfter });
    await ledger.record({
      transactionId: tx._id, userId, walletId: tx.walletId, entry: 'credit',
      amount: amountKobo, balanceBefore: revBefore, balanceAfter: revAfter,
      description: `Refund: exam PIN purchase failed`,
    });
    throw Object.assign(new Error(`${providerErr.message} — your wallet has been reversed.`), { statusCode: 502 });
  }
};

module.exports = { getPlans, getRawPlans, buy };
