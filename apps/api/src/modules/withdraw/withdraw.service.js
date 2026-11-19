const mongoose = require('mongoose');
const Paystack = require('../../providers/paystack/paystack.client');
const BankAccount = require('../../models/BankAccount');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const walletService = require('../wallet/wallet.service');
const ledger = require('../../services/ledger.service');
const fraud = require('../../services/fraud.service');
const notify = require('../notifications/notifications.service');
const otp = require('../../utils/otp');

const MIN_AMOUNT_KOBO = 50000; // ₦500

let banksCache = null;
let banksCacheAt = 0;
const BANKS_CACHE_MS = 60 * 60 * 1000; // bank list barely changes — 1 hour is plenty

const getBanks = async () => {
  if (banksCache && Date.now() - banksCacheAt < BANKS_CACHE_MS) return banksCache;
  const res = await Paystack.getBanks();
  banksCache = (res.data || []).map((b) => ({ code: b.code, name: b.name }));
  banksCacheAt = Date.now();
  return banksCache;
};

// Read-only name-enquiry against the real bank record — no money moves,
// no recipient is created yet.
const verifyAccount = async (bankCode, accountNumber) => {
  const res = await Paystack.resolveAccount(accountNumber, bankCode);
  return { accountName: res.data.account_name };
};

const addBankAccount = async (userId, { bankCode, bankName, accountNumber }) => {
  const existing = await BankAccount.findOne({ userId, bankCode, accountNumber });
  if (existing) throw Object.assign(new Error('This bank account is already saved'), { statusCode: 409 });

  // Never trust a client-supplied account name — resolve it ourselves.
  const { accountName } = await verifyAccount(bankCode, accountNumber);

  const recipient = await Paystack.createTransferRecipient({ name: accountName, accountNumber, bankCode });
  const recipientCode = recipient.data.recipient_code;

  const account = await BankAccount.create({ userId, bankCode, bankName, accountNumber, accountName, recipientCode });
  return sanitizeAccount(account);
};

const getBankAccounts = async (userId) => {
  const accounts = await BankAccount.find({ userId }).sort({ createdAt: -1 });
  return accounts.map(sanitizeAccount);
};

const deleteBankAccount = async (userId, id) => {
  const result = await BankAccount.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw Object.assign(new Error('Bank account not found'), { statusCode: 404 });
  return { message: 'Bank account removed' };
};

const sanitizeAccount = (a) => ({
  id: a._id, bankCode: a.bankCode, bankName: a.bankName,
  accountNumber: a.accountNumber, accountName: a.accountName,
});

const withdraw = async (userId, { bankAccountId, amountNGN, pin }) => {
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!(await user.comparePin(pin))) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const account = await BankAccount.findOne({ _id: bankAccountId, userId });
  if (!account) throw Object.assign(new Error('Bank account not found'), { statusCode: 404 });

  const amountKobo = Math.round(amountNGN * 100);
  if (amountKobo < MIN_AMOUNT_KOBO) {
    throw Object.assign(new Error(`Minimum withdrawal is ₦${(MIN_AMOUNT_KOBO / 100).toLocaleString()}`), { statusCode: 400 });
  }

  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx, wallet;
  try {
    const result = await walletService.debit(userId, amountKobo, session);
    wallet = result.wallet;
    const reference = otp.generateRef();

    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'withdrawal', direction: 'debit', amount: amountKobo, status: 'pending',
      balanceBefore: result.balanceBefore, balanceAfter: result.balanceAfter,
      meta: { bankName: account.bankName, accountNumber: account.accountNumber, counterpartyName: account.accountName },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit',
      amount: amountKobo, balanceBefore: result.balanceBefore, balanceAfter: result.balanceAfter,
      description: `Withdrawal to ${account.bankName} ${account.accountNumber}`,
    }, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  try {
    const result = await Paystack.initiateTransfer({
      amountKobo, recipientCode: account.recipientCode, reference: tx.reference,
      reason: `WavyPay withdrawal — ${user.firstName} ${user.lastName}`,
    });

    if (result.data?.status === 'success') {
      await Transaction.findByIdAndUpdate(tx._id, {
        status: 'success',
        providerReference: result.data.transfer_code,
        providerStatus: result.data.status,
        providerResponse: result.data,
      });
      notify.createNotification(userId, {
        title: 'Withdrawal Successful ✓',
        body: `₦${amountNGN.toLocaleString()} sent to ${account.bankName} ${account.accountNumber}.`,
        type: 'wallet', meta: { reference: tx.reference },
      });
      return { message: 'Withdrawal successful', reference: tx.reference, status: 'success' };
    }

    // "pending" or "otp" (business-side approval, not ours to automate
    // around) — money isn't lost, just not final yet. transfer.success/
    // failed/reversed webhook resolves it from here.
    await Transaction.findByIdAndUpdate(tx._id, {
      providerReference: result.data?.transfer_code,
      providerStatus: result.data?.status,
      providerResponse: result.data,
    });
    return { message: 'Withdrawal is processing', reference: tx.reference, status: 'pending' };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error(`${providerErr.message} — your wallet has been reversed.`), { statusCode: 502 });
  }
};

module.exports = { getBanks, verifyAccount, addBankAccount, getBankAccounts, deleteBankAccount, withdraw };
