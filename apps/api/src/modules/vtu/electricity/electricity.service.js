const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');

const DISCOS = ['IKEDC', 'EKEDC', 'AEDC', 'KAEDC', 'JED', 'PHEDC', 'KEDCO', 'BEDC'];

const verifyMeter = async (disco, meterNumber, meterType) => {
  if (!DISCOS.includes(disco)) throw Object.assign(new Error('Invalid DisCo'), { statusCode: 400 });
  const result = await AidaPay.verifyMeter(disco, meterNumber, meterType);
  return result.data;
};

const pay = async (userId, { disco, meterNumber, meterType, amount, phone, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid PIN'), { statusCode: 403 });

  if (amount < 500) throw Object.assign(new Error('Minimum electricity payment is ₦500'), { statusCode: 400 });
  const amountKobo = Math.round(amount * 100);
  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();
    [tx] = await Transaction.create([{ reference: ref, userId, walletId: wallet._id, type: 'electricity', direction: 'debit', amount: amountKobo, status: 'pending', balanceBefore, balanceAfter, meta: { disco, meterNumber, meterType }, processedAt: new Date() }], { session });
    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${disco} electricity ₦${amount} → ${meterNumber}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }

  try {
    const result = await AidaPay.payElectricity(disco, meterNumber, meterType, amount, phone);
    const token = result.data?.token;
    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: result.data?.transactionId, providerResponse: result.data, 'meta.token': token });
    return { message: 'Electricity payment successful', reference: tx.reference, token };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Payment failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { verifyMeter, pay };
