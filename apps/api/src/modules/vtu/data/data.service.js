const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');

const getPlans = async (network) => {
  const result = await AidaPay.getDataPlans(network);
  return result.data;
};

const buy = async (userId, { network, phone, planId, amount, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const amountKobo = Math.round(amount * 100);
  await fraud.checkVelocity(userId);
  await fraud.checkDuplicate(userId, 'data', { phone, amount: amountKobo });

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();

    [tx] = await Transaction.create([{
      reference: ref, userId, walletId: wallet._id,
      type: 'data', direction: 'debit', amount: amountKobo,
      status: 'pending', balanceBefore, balanceAfter,
      meta: { network, phone, dataBundle: planId },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${network} data ${planId} → ${phone}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; }
  finally { session.endSession(); }

  try {
    const result = await AidaPay.buyData(network, phone, planId);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: result.data?.transactionId, providerResponse: result.data });
    return { message: 'Data purchased successfully', reference: tx.reference };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Data purchase failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { getPlans, buy };
