const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const referralService = require('../../referral/referral.service');

// AidaPay has no dedicated "exam types" endpoint — exam boards are listed
// as providers under the generic education service slug.
const getTypes = async () => {
  const result = await AidaPay.getProviders(AidaPay.SLUGS.exam);
  const providers = result.data?.data ?? [];
  return providers.map((p) => ({
    id: p.provider_code,
    name: p.provider_name,
    amount: Number(p.min_amount),
  }));
};

const buy = async (userId, { examType, quantity = 1, amount, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid PIN'), { statusCode: 403 });

  const amountKobo = Math.round(amount * 100);
  const unitAmount = amount / quantity;
  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();
    [tx] = await Transaction.create([{ reference: ref, userId, walletId: wallet._id, type: 'exam', direction: 'debit', amount: amountKobo, status: 'pending', balanceBefore, balanceAfter, meta: { examType }, processedAt: new Date() }], { session });
    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${examType} exam PIN x${quantity}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }

  try {
    // AidaPay's documented /buy body has no quantity/batch field, and no
    // exam-PIN-specific "recipient" semantics — this calls /buy once per
    // PIN using the account holder's own phone as the recipient. Unverified
    // against a live response; revisit once the AidaPay account is active.
    const pins = [];
    const hashes = [];
    for (let i = 0; i < quantity; i++) {
      const unitRef = quantity > 1 ? `${tx.reference}-${i + 1}` : tx.reference;
      const result = await AidaPay.buy({ recipient: user.phone.number, providerCode: examType, ref: unitRef, amount: unitAmount });
      const txn = result.data?.data?.transaction_data;
      hashes.push(txn?.transaction_hash);
      if (txn?.pin) pins.push(txn.pin);
    }

    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'success',
      providerReference: hashes[0],
      'meta.examPin': pins[0],
    });
    referralService.creditReferralBonusIfQualifying(userId, tx._id)
      .catch((err) => console.error('[referral]', err));
    return { message: 'Exam PIN purchased', reference: tx.reference, pin: pins[0], pins };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Exam PIN purchase failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { getTypes, buy };
