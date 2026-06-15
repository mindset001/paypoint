const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');

const getTypes = async () => {
  const result = await AidaPay.getExamTypes();
  return result.data;
};

const buy = async (userId, { examType, quantity = 1, amount, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid PIN'), { statusCode: 403 });

  const amountKobo = Math.round(amount * 100);
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
    const result = await AidaPay.buyExamPin(examType, quantity);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: result.data?.transactionId, providerResponse: result.data, 'meta.examPin': result.data?.pin });
    return { message: 'Exam PIN purchased', reference: tx.reference, pin: result.data?.pin, pins: result.data?.pins };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Exam PIN purchase failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { getTypes, buy };
