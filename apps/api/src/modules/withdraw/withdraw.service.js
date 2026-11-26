const mongoose = require('mongoose');
const Paystack = require('../../providers/paystack/paystack.client');
const BankAccount = require('../../models/BankAccount');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const walletService = require('../wallet/wallet.service');
const ledger = require('../../services/ledger.service');
const fraud = require('../../services/fraud.service');
const emailService = require('../../services/email.service');
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

// Fans out a bell notification + best-effort email to every admin —
// mirrors aidapayMonitor.service.js#alertAdmins' delivery pattern. There's
// no automated payout provider wired up (see withdraw() below), so an
// admin has to manually send the money and then approve/reject it from
// Admin > Reconciliation > Pending Withdrawals.
const alertAdminsOfWithdrawal = async (user, account, amountNGN) => {
  const admins = await User.find(
    { role: { $in: ['admin', 'developer'] }, status: { $ne: 'suspended' } },
    'email'
  );
  if (!admins.length) return;

  const title = 'New withdrawal request';
  const body = `${user.firstName} ${user.lastName} requested ₦${amountNGN.toLocaleString()} to ${account.bankName} ${account.accountNumber} (${account.accountName}). Send it manually, then approve in Reconciliation.`;

  await Notification.insertMany(
    admins.map((a) => ({ userId: a._id, title, body, type: 'system' }))
  );

  await Promise.all(
    admins
      .filter((a) => a.email?.address)
      .map((a) =>
        emailService
          .sendAlertEmail(a.email.address, { subject: title, heading: title, message: body })
          .catch((err) => console.error(`[withdraw] failed to email ${a.email.address}:`, err.message))
      )
  );
};

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

  // No automated payout provider — the business account's own payout
  // balance isn't reliably funded (confirmed live: Paystack transfers kept
  // failing with "Your balance is not enough to fulfil this request",
  // unrelated to any user's wallet). An admin sends the money by hand to
  // the account above, then approves or rejects it from Admin >
  // Reconciliation > Pending Withdrawals (admin.service.js#approveWithdrawal
  // / rejectWithdrawal) — the wallet's already debited above either way, so
  // approving just finalizes the status and rejecting refunds it.
  alertAdminsOfWithdrawal(user, account, amountNGN).catch((err) => console.error('[withdraw] admin alert failed:', err.message));

  return { message: 'Withdrawal request submitted — you\'ll receive payment within 24 hours', reference: tx.reference, status: 'pending' };
};

module.exports = { getBanks, verifyAccount, addBankAccount, getBankAccounts, deleteBankAccount, withdraw };
