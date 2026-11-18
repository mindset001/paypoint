const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const notify = require('../../notifications/notifications.service');
const referralService = require('../../referral/referral.service');

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

const buy = async (userId, { network, phone, amount, pin }) => {
  if (!NETWORKS.includes(network)) throw Object.assign(new Error('Invalid network'), { statusCode: 400 });
  if (amount < 50 || amount > 50000) throw Object.assign(new Error('Amount must be between ₦50 and ₦50,000'), { statusCode: 400 });

  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const amountKobo = Math.round(amount * 100);
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
      meta: { network, phone },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit',
      amount: amountKobo, balanceBefore, balanceAfter,
      description: `${network} airtime ₦${amount} → ${phone}`,
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
    const result = await AidaPay.buy({ recipient: phone, providerCode, ref: tx.reference, amount });
    const txn = result.data?.data?.transaction_data;

    const charged = Number(txn?.amount_paid ?? txn?.amount);
    if (Number.isFinite(charged) && Math.abs(charged - amount) > 0.5) {
      console.error(`[aidapay] price mismatch on ${network} airtime ${tx.reference}: expected ₦${amount}, AidaPay charged ₦${charged}`);
    }

    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'success',
      providerReference: txn?.transaction_hash,
      providerStatus: txn?.status,
      providerResponse: result.data,
    });
    notify.createNotification(userId, {
      title: 'Airtime Sent ✓',
      body: `₦${amount.toLocaleString()} ${network} airtime sent to ${phone}.`,
      type: 'transaction',
      meta: { reference: tx.reference },
    });
    referralService.creditReferralBonusIfQualifying(userId, tx._id)
      .catch((err) => console.error('[referral]', err));
    return { message: 'Airtime purchased successfully', reference: tx.reference, network, phone, amount };
  } catch (providerErr) {
    // Reverse debit on provider failure
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'failed',
      failureReason: providerErr.message,
    });
    notify.createNotification(userId, {
      title: 'Airtime Purchase Failed',
      body: `₦${amount.toLocaleString()} airtime to ${phone} failed. Your wallet has been reversed.`,
      type: 'transaction',
      meta: { reference: tx.reference },
    });
    throw Object.assign(new Error('Airtime purchase failed. Your wallet has been reversed.'), { statusCode: 502 });
  }
};

module.exports = { buy };
