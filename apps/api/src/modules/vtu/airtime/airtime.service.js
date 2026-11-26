const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const notify = require('../../notifications/notifications.service');
const referralService = require('../../referral/referral.service');
const cashbackService = require('../../../services/cashback.service');
const pricing = require('../../../services/pricing.service');

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

// `amount` is what the recipient actually receives (sent to AidaPay
// as-is); the wallet is charged that plus the markup. Never trust a
// client-supplied "amount" as the final charge — it's the raw request.
const buy = async (userId, { network, phone, amount: rawAmount, pin }) => {
  if (!NETWORKS.includes(network)) throw Object.assign(new Error('Invalid network'), { statusCode: 400 });
  if (rawAmount < 50 || rawAmount > 50000) throw Object.assign(new Error('Amount must be between ₦50 and ₦50,000'), { statusCode: 400 });

  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const chargedAmount = pricing.priceFor(rawAmount, user);
  const amountKobo = Math.round(chargedAmount * 100);
  await fraud.checkVelocity(userId);
  await fraud.checkDuplicate(userId, 'airtime', { phone, amount: amountKobo });

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();

    [tx] = await Transaction.create([{
      reference: ref,
      userId,
      walletId: wallet._id,
      type: 'airtime',
      direction: 'debit',
      amount: amountKobo,
      status: 'pending',
      balanceBefore,
      balanceAfter,
      meta: { network, phone, marginAmount: amountKobo - Math.round(rawAmount * 100) },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit',
      amount: amountKobo, balanceBefore, balanceAfter,
      description: `${network} airtime ₦${rawAmount} → ${phone}`,
    }, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  try {
    const providerCode = await AidaPay.resolveProviderCode(AidaPay.SLUGS.airtime, network);
    const result = await AidaPay.buy({ recipient: phone, providerCode, ref: tx.reference, amount: rawAmount });
    const txn = result.data?.data?.transaction_data;

    const charged = Number(txn?.amount_paid ?? txn?.amount);
    if (Number.isFinite(charged) && Math.abs(charged - rawAmount) > 0.5) {
      console.error(`[aidapay] price mismatch on ${network} airtime ${tx.reference}: expected raw ₦${rawAmount}, AidaPay charged ₦${charged}`);
    }

    // AidaPay can return "Processing" here instead of "Completed" — the
    // real outcome (success or Cancelled/Refund) arrives later via webhook.
    // Marking this 'success' immediately would make handleAidaPayWebhook's
    // `tx.status !== 'pending'` guard ignore that later refund, permanently
    // stranding the debit if AidaPay ends up reversing it (same fix as
    // electricity.service.js's token-gated status).
    const isCompleted = txn?.status === 'Completed';
    await Transaction.findByIdAndUpdate(tx._id, {
      status: isCompleted ? 'success' : 'pending',
      providerReference: txn?.transaction_hash,
      providerStatus: txn?.status,
      providerResponse: result.data,
    });
    if (isCompleted) {
      notify.createNotification(userId, {
        title: 'Airtime Sent ✓',
        body: `₦${rawAmount.toLocaleString()} ${network} airtime sent to ${phone}.`,
        type: 'transaction',
        meta: { reference: tx.reference },
      });
      referralService.creditReferralBonusIfQualifying(userId, tx._id)
        .catch((err) => console.error('[referral]', err));
      cashbackService.creditCashbackIfApplicable(userId, user.role, tx._id, amountKobo)
        .catch((err) => console.error('[cashback]', err));
    }
    return {
      message: isCompleted ? 'Airtime purchased successfully' : 'Your airtime purchase is processing — we\'ll notify you once it completes',
      reference: tx.reference, network, phone, amount: rawAmount, charged: chargedAmount,
    };
  } catch (providerErr) {
    // Reverse debit on provider failure — record it like any other money
    // movement (ledger entry + the transaction's own balance snapshot
    // updated), not just a silent wallet.balance change the receipt never
    // reflects.
    const { balanceBefore: revBefore, balanceAfter: revAfter } = await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'failed',
      failureReason: providerErr.message,
      balanceAfter: revAfter,
    });
    await ledger.record({
      transactionId: tx._id, userId, walletId: tx.walletId, entry: 'credit',
      amount: amountKobo, balanceBefore: revBefore, balanceAfter: revAfter,
      description: `Refund: ${network} airtime purchase failed`,
    });
    notify.createNotification(userId, {
      title: 'Airtime Purchase Failed',
      body: `₦${rawAmount.toLocaleString()} airtime to ${phone} failed. Your wallet has been reversed.`,
      type: 'transaction',
      meta: { reference: tx.reference },
    });
    throw Object.assign(new Error(`${providerErr.message} — your wallet has been reversed.`), { statusCode: 502 });
  }
};

const MIN_BULK_RECIPIENTS = 2;
const MAX_BULK_RECIPIENTS = 50;

// Same network for every recipient, independent amount per number — one
// Transaction for the whole batch (not one per recipient) with each
// recipient's own outcome recorded in meta.recipients, same pattern as
// exam.service.js's quantity loop. A recipient that fails gets exactly
// their own charged amount refunded, not the whole batch.
const bulkBuy = async (userId, { network, recipients, pin }) => {
  if (!NETWORKS.includes(network)) throw Object.assign(new Error('Invalid network'), { statusCode: 400 });
  if (!Array.isArray(recipients) || recipients.length < MIN_BULK_RECIPIENTS || recipients.length > MAX_BULK_RECIPIENTS) {
    throw Object.assign(new Error(`Provide between ${MIN_BULK_RECIPIENTS} and ${MAX_BULK_RECIPIENTS} recipients`), { statusCode: 400 });
  }
  for (const r of recipients) {
    if (!/^\+?[0-9]{10,14}$/.test(r.phone)) throw Object.assign(new Error(`Invalid phone number: ${r.phone}`), { statusCode: 400 });
    if (!(r.amount >= 50 && r.amount <= 50000)) throw Object.assign(new Error(`Amount for ${r.phone} must be between ₦50 and ₦50,000`), { statusCode: 400 });
  }

  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const priced = recipients.map((r) => ({ ...r, chargedAmount: pricing.priceFor(r.amount, user) }));
  const totalChargedKobo = Math.round(priced.reduce((sum, r) => sum + r.chargedAmount, 0) * 100);
  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx, wallet;
  try {
    const result = await walletService.debit(userId, totalChargedKobo, session);
    wallet = result.wallet;
    const reference = otp.generateRef();

    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'bulk_airtime', direction: 'debit', amount: totalChargedKobo, status: 'pending',
      balanceBefore: result.balanceBefore, balanceAfter: result.balanceAfter,
      meta: { network, recipients: priced.map((r) => ({ phone: r.phone, amount: r.amount, status: 'pending' })) },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit',
      amount: totalChargedKobo, balanceBefore: result.balanceBefore, balanceAfter: result.balanceAfter,
      description: `Bulk ${network} airtime to ${recipients.length} numbers`,
    }, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  const providerCode = await AidaPay.resolveProviderCode(AidaPay.SLUGS.airtime, network);
  const results = [];
  let refundKobo = 0;

  for (let i = 0; i < priced.length; i++) {
    const r = priced[i];
    const unitRef = `${tx.reference}-${i + 1}`;
    try {
      const buyResult = await AidaPay.buy({ recipient: r.phone, providerCode, ref: unitRef, amount: r.amount });
      const txn = buyResult.data?.data?.transaction_data;
      results.push({ phone: r.phone, amount: r.amount, status: 'success', providerReference: txn?.transaction_hash });
    } catch (err) {
      results.push({ phone: r.phone, amount: r.amount, status: 'failed', reason: err.message });
      refundKobo += Math.round(r.chargedAmount * 100);
    }
  }

  const update = { 'meta.recipients': results };

  if (refundKobo > 0) {
    const refund = await walletService.credit(userId, refundKobo, null);
    update.balanceAfter = refund.balanceAfter;
    await ledger.record({
      transactionId: tx._id, userId, walletId: tx.walletId, entry: 'credit',
      amount: refundKobo, balanceBefore: refund.balanceBefore, balanceAfter: refund.balanceAfter,
      description: `Refund: ${results.filter((r) => r.status === 'failed').length} of ${recipients.length} bulk airtime sends failed`,
    });
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const allFailed = successCount === 0;
  update.status = allFailed ? 'failed' : 'success';
  if (allFailed) update.failureReason = 'All recipients failed';
  await Transaction.findByIdAndUpdate(tx._id, update);

  if (successCount > 0) {
    referralService.creditReferralBonusIfQualifying(userId, tx._id).catch((err) => console.error('[referral]', err));
    cashbackService.creditCashbackIfApplicable(userId, user.role, tx._id, totalChargedKobo - refundKobo).catch((err) => console.error('[cashback]', err));
  }

  notify.createNotification(userId, {
    title: allFailed ? 'Bulk Airtime Failed' : successCount === recipients.length ? 'Bulk Airtime Sent ✓' : 'Bulk Airtime Partially Sent',
    body: `${successCount}/${recipients.length} ${network} airtime sends succeeded.${refundKobo > 0 ? ` ₦${(refundKobo / 100).toLocaleString()} refunded.` : ''}`,
    type: 'transaction', meta: { reference: tx.reference },
  });

  if (allFailed) {
    throw Object.assign(new Error('All recipients failed — your wallet has been fully refunded.'), { statusCode: 502 });
  }

  return { message: `${successCount}/${recipients.length} sent successfully`, reference: tx.reference, results };
};

module.exports = { buy, bulkBuy };
