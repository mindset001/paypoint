const mongoose = require('mongoose');
const SavingsLock = require('../../models/SavingsLock');
const Transaction = require('../../models/Transaction');
const walletService = require('../wallet/wallet.service');
const ledger = require('../../services/ledger.service');
const notify = require('../notifications/notifications.service');
const otp = require('../../utils/otp');

const MIN_DAYS = 7;
const MAX_DAYS = 365;
const MIN_AMOUNT_KOBO = 100000; // ₦1,000

const sanitizeLock = (lock) => ({
  id: lock._id,
  name: lock.name,
  amount: lock.amount,
  status: lock.status,
  startDate: lock.startDate,
  maturityDate: lock.maturityDate,
  withdrawnAt: lock.withdrawnAt,
  isMatured: lock.status === 'active' && lock.maturityDate <= new Date(),
});

// Locking is a wallet debit (PIN required, same as any other money leaving
// the spendable balance) — the principal lives on SavingsLock, not Wallet,
// so it can't be double-counted as spendable.
const createLock = async (userId, { name, amountNGN, durationDays, pin }) => {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!(await user.comparePin(pin))) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const trimmedName = (name || '').trim();
  if (!trimmedName) throw Object.assign(new Error('Give this savings lock a name'), { statusCode: 400 });

  const days = parseInt(durationDays, 10);
  if (!Number.isFinite(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw Object.assign(new Error(`Lock duration must be between ${MIN_DAYS} and ${MAX_DAYS} days`), { statusCode: 400 });
  }

  const amountKobo = Math.round(amountNGN * 100);
  if (amountKobo < MIN_AMOUNT_KOBO) {
    throw Object.assign(new Error(`Minimum savings amount is ₦${(MIN_AMOUNT_KOBO / 100).toLocaleString()}`), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  let lock, tx;
  try {
    const { wallet, balanceBefore, balanceAfter } = await walletService.debit(userId, amountKobo, session);

    const maturityDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    [lock] = await SavingsLock.create([{
      userId, walletId: wallet._id, name: trimmedName, amount: amountKobo,
      status: 'active', startDate: new Date(), maturityDate,
    }], { session });

    const reference = otp.generateRef();
    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'savings', direction: 'debit', amount: amountKobo, status: 'success',
      balanceBefore, balanceAfter,
      meta: { narration: `Locked into "${lock.name}" until ${maturityDate.toDateString()}` },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `Savings lock: ${lock.name}` }, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  notify.createNotification(userId, {
    title: 'Savings Locked 🔒',
    body: `₦${(amountKobo / 100).toLocaleString()} locked into "${lock.name}" until ${lock.maturityDate.toDateString()}.`,
    type: 'wallet', meta: { reference: tx.reference },
  });

  return sanitizeLock(lock);
};

// Topping up is a wallet debit added onto an existing lock's principal —
// the maturityDate never moves, so repeated top-ups can't be used to keep
// pushing back when the money becomes withdrawable.
const topUpLock = async (userId, lockId, amountNGN, pin) => {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!(await user.comparePin(pin))) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const lock = await SavingsLock.findOne({ _id: lockId, userId });
  if (!lock) throw Object.assign(new Error('Savings lock not found'), { statusCode: 404 });
  if (lock.status !== 'active') throw Object.assign(new Error('This savings lock has already been withdrawn'), { statusCode: 400 });

  const amountKobo = Math.round(amountNGN * 100);
  if (!Number.isFinite(amountKobo) || amountKobo < MIN_AMOUNT_KOBO) {
    throw Object.assign(new Error(`Minimum top-up is ₦${(MIN_AMOUNT_KOBO / 100).toLocaleString()}`), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { wallet, balanceBefore, balanceAfter } = await walletService.debit(userId, amountKobo, session);

    const reference = otp.generateRef();
    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'savings', direction: 'debit', amount: amountKobo, status: 'success',
      balanceBefore, balanceAfter,
      meta: { narration: `Topped up "${lock.name}"` },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `Savings top-up: ${lock.name}` }, session);

    lock.amount += amountKobo;
    await lock.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  notify.createNotification(userId, {
    title: 'Savings Topped Up 💰',
    body: `₦${(amountKobo / 100).toLocaleString()} added to "${lock.name}" — now ₦${(lock.amount / 100).toLocaleString()} total.`,
    type: 'wallet', meta: { reference: tx.reference },
  });

  return sanitizeLock(lock);
};

const getLocks = async (userId) => {
  const locks = await SavingsLock.find({ userId }).sort({ createdAt: -1 });
  return locks.map(sanitizeLock);
};

// Withdrawal is a plain wallet credit — no PIN needed, same as any other
// money moving into the spendable balance (e.g. wallet funding).
const withdrawLock = async (userId, lockId) => {
  const lock = await SavingsLock.findOne({ _id: lockId, userId });
  if (!lock) throw Object.assign(new Error('Savings lock not found'), { statusCode: 404 });
  if (lock.status !== 'active') throw Object.assign(new Error('This savings lock has already been withdrawn'), { statusCode: 400 });
  if (lock.maturityDate > new Date()) {
    throw Object.assign(new Error(`Still locked until ${lock.maturityDate.toDateString()}`), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { wallet, balanceBefore, balanceAfter } = await walletService.credit(userId, lock.amount, session);

    const reference = otp.generateRef();
    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'savings', direction: 'credit', amount: lock.amount, status: 'success',
      balanceBefore, balanceAfter,
      meta: { narration: `Withdrawal from "${lock.name}"` },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'credit', amount: lock.amount, balanceBefore, balanceAfter, description: `Savings withdrawal: ${lock.name}` }, session);

    lock.status = 'withdrawn';
    lock.withdrawnAt = new Date();
    await lock.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  notify.createNotification(userId, {
    title: 'Savings Withdrawn ✓',
    body: `₦${(lock.amount / 100).toLocaleString()} from "${lock.name}" moved back to your wallet.`,
    type: 'wallet', meta: { reference: tx.reference },
  });

  return sanitizeLock(lock);
};

module.exports = { createLock, getLocks, withdrawLock, topUpLock };
