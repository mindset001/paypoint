const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');

const PROVIDERS = ['DSTV', 'GOTV', 'STARTIMES'];

const getPlans = async (provider) => {
  const result = await AidaPay.getCablePlans(provider);
  return result.data;
};

const verifySmartcard = async (provider, smartcardNumber) => {
  if (!PROVIDERS.includes(provider)) throw Object.assign(new Error('Invalid provider'), { statusCode: 400 });
  const result = await AidaPay.verifySmartcard(provider, smartcardNumber);
  return result.data;
};

const subscribe = async (userId, { provider, smartcardNumber, planCode, amount, pin }) => {
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
    [tx] = await Transaction.create([{ reference: ref, userId, walletId: wallet._id, type: 'cable', direction: 'debit', amount: amountKobo, status: 'pending', balanceBefore, balanceAfter, meta: { cableProvider: provider, smartcardNumber }, processedAt: new Date() }], { session });
    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${provider} subscription ${planCode}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }

  try {
    const result = await AidaPay.subscribeCable(provider, smartcardNumber, planCode);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: result.data?.transactionId, providerResponse: result.data });
    return { message: 'Cable subscription successful', reference: tx.reference };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Cable subscription failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { getPlans, verifySmartcard, subscribe };
