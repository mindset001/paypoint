const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const referralService = require('../../referral/referral.service');

const getPlans = async (provider) => {
  const providerCode = await AidaPay.resolveProviderCode(AidaPay.SLUGS.cable, provider);
  const result = await AidaPay.getPackages(providerCode);
  const packages = result.data?.data ?? [];
  return packages.map((p) => ({
    planCode: p.package_api_code,
    name: p.package_name,
    amount: Number(p.package_amount),
  }));
};

const verifySmartcard = async (provider, smartcardNumber) => {
  const providerCode = await AidaPay.resolveProviderCode(AidaPay.SLUGS.cable, provider);
  const { name } = await AidaPay.verifyRecipient(providerCode, smartcardNumber);
  return { name, currentPackage: '' };
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
    const providerCode = await AidaPay.resolveProviderCode(AidaPay.SLUGS.cable, provider);
    const result = await AidaPay.buy({ recipient: smartcardNumber, providerCode, ref: tx.reference, packageCode: planCode });
    const txn = result.data?.data?.transaction_data;

    const charged = Number(txn?.amount_paid ?? txn?.amount);
    if (Number.isFinite(charged) && Math.abs(charged - amount) > 0.5) {
      console.error(`[aidapay] price mismatch on ${provider} cable ${tx.reference}: expected ₦${amount}, AidaPay charged ₦${charged}`);
    }

    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: txn?.transaction_hash, providerStatus: txn?.status, providerResponse: result.data });
    referralService.creditReferralBonusIfQualifying(userId, tx._id)
      .catch((err) => console.error('[referral]', err));
    return { message: 'Cable subscription successful', reference: tx.reference };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error('Cable subscription failed. Wallet reversed.'), { statusCode: 502 });
  }
};

module.exports = { getPlans, verifySmartcard, subscribe };
