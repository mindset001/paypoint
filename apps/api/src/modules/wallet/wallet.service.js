const mongoose = require('mongoose');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const ledger = require('../../services/ledger.service');
const otp = require('../../utils/otp');
const notify = require('../notifications/notifications.service');
const env = require('../../config/env');

const getWallet = async (userId) => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
  return { ...wallet.toObject(), balanceNGN: wallet.balance / 100 };
};

const debit = async (userId, amountKobo, session) => {
  const wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
  if (wallet.balance < amountKobo) {
    throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 402 });
  }
  const before = wallet.balance;
  wallet.balance -= amountKobo;
  wallet.totalSpent += amountKobo;
  await wallet.save({ session });
  return { wallet, balanceBefore: before, balanceAfter: wallet.balance };
};

const credit = async (userId, amountKobo, session) => {
  const wallet = await Wallet.findOne({ userId }).session(session || null);
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
  const before = wallet.balance;
  wallet.balance += amountKobo;
  wallet.totalFunded += amountKobo;
  await wallet.save({ session: session || undefined });
  return { wallet, balanceBefore: before, balanceAfter: wallet.balance };
};

// ── Wallet Funding ─────────────────────────────────────────────────────

const CALLBACK_URL = (provider) =>
  `${env.CLIENT_URL}/wallet/callback?provider=${provider}`;

const FUND_PROVIDERS = ['paystack', 'flutterwave', 'monnify'];

const initiateWalletFund = async (userId, amountNGN, email, provider = 'paystack') => {
  if (!FUND_PROVIDERS.includes(provider)) {
    throw Object.assign(new Error('Unsupported payment provider'), { statusCode: 400 });
  }

  const amountKobo = Math.round(amountNGN * 100);
  if (amountKobo < 10000) throw Object.assign(new Error('Minimum fund amount is ₦100'), { statusCode: 400 });

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });

  const reference = otp.generateRef();

  await Transaction.create({
    reference,
    userId,
    walletId: wallet._id,
    type: 'wallet_fund',
    direction: 'credit',
    amount: amountKobo,
    status: 'pending',
    balanceBefore: wallet.balance,
    balanceAfter: wallet.balance,
    meta: { provider },
  });

  try {
    if (provider === 'paystack') {
      const Paystack = require('../../providers/paystack/paystack.client');
      const result = await Paystack.initializeTransaction({
        email,
        amount: amountKobo,
        reference,
        callbackUrl: CALLBACK_URL('paystack'),
        metadata: { userId: userId.toString(), amountNGN },
      });
      return { provider: 'paystack', authorizationUrl: result.data.authorization_url, reference };
    }

    if (provider === 'flutterwave') {
      const Flutterwave = require('../../providers/flutterwave/flutterwave.client');
      const User = require('../../models/User');
      const user = await User.findById(userId).select('firstName lastName phone');
      const result = await Flutterwave.initializePayment({
        txRef: reference,
        amount: amountNGN,
        email,
        phone: user?.phone?.number,
        name: `${user?.firstName} ${user?.lastName}`,
        redirectUrl: CALLBACK_URL('flutterwave'),
        description: `Fund PayPoint wallet — ₦${amountNGN.toLocaleString()}`,
        meta: { userId: userId.toString() },
      });
      return { provider: 'flutterwave', authorizationUrl: result.data.link, reference };
    }

    // provider === 'monnify'
    const Monnify = require('../../providers/monnify/monnify.client');
    const User = require('../../models/User');
    const user = await User.findById(userId).select('firstName lastName');
    const result = await Monnify.initializeTransaction({
      amount: amountNGN,
      customerName: `${user?.firstName} ${user?.lastName}`,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: `PayPoint wallet funding — ₦${amountNGN.toLocaleString()}`,
      redirectUrl: CALLBACK_URL('monnify'),
    });
    return { provider: 'monnify', authorizationUrl: result.responseBody?.checkoutUrl, reference };
  } catch (err) {
    await Transaction.findOneAndUpdate(
      { reference, status: 'pending' },
      { status: 'failed', failureReason: err.message }
    );
    throw err;
  }
};

// ── Virtual Account (Monnify reserved account) ─────────────────────────

const getOrCreateVirtualAccount = async (userId) => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });

  if (wallet.reservedAccount?.accountNumber) {
    return wallet.reservedAccount;
  }

  const Monnify = require('../../providers/monnify/monnify.client');
  const User = require('../../models/User');
  const user = await User.findById(userId).select('firstName lastName email');
  const accountReference = `PP_${userId.toString().slice(-8).toUpperCase()}`;

  const result = await Monnify.reserveAccount({
    accountReference,
    accountName: `${user.firstName} ${user.lastName}`,
    email: user.email.address,
  });

  const body = result.responseBody;
  const account = body?.accounts?.[0] ?? {};

  wallet.reservedAccount = {
    provider: 'monnify',
    accountNumber: account.accountNumber,
    accountName: body?.accountName,
    bankName: account.bankName,
    bankCode: account.bankCode,
    reference: accountReference,
    createdAt: new Date(),
  };
  await wallet.save();
  return wallet.reservedAccount;
};

// ── Internal: complete a pending wallet-fund Transaction ────────────────
//
// Every funding attempt already has a `pending` Transaction row created by
// initiateWalletFund, keyed by `reference` (the value we generated and handed
// to the provider). Completion — whether via webhook or the manual /verify
// call — claims and finishes that specific row instead of re-deriving the
// user from provider-reported customer details.

const completeWalletFund = async ({ reference, providerAmountKobo, providerTransactionId, channel, attempt = 1 }) => {
  const existing = await Transaction.findOne({ reference });
  if (!existing) return { outcome: 'unknown' };
  if (existing.status !== 'pending') return { outcome: 'already_processed', tx: existing };

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOneAndUpdate(
      { reference, status: 'pending' },
      { status: 'success', providerReference: providerTransactionId, providerStatus: 'success', processedAt: new Date() },
      { session, new: true }
    );

    if (!tx) {
      await session.abortTransaction();
      return { outcome: 'already_processed' };
    }

    if (providerAmountKobo != null && providerAmountKobo !== tx.amount) {
      console.error(`[wallet] amount mismatch on ${reference}: expected ${tx.amount}, provider reported ${providerAmountKobo}`);
    }

    const { balanceBefore, balanceAfter } = await credit(tx.userId, tx.amount, session);

    await Transaction.findByIdAndUpdate(
      tx._id,
      { balanceBefore, balanceAfter, 'meta.channel': channel },
      { session }
    );

    await ledger.record({
      transactionId: tx._id,
      userId: tx.userId,
      walletId: tx.walletId,
      entry: 'credit',
      amount: tx.amount,
      balanceBefore,
      balanceAfter,
      description: `Wallet funded via ${tx.meta?.provider}${channel ? `/${channel}` : ''} — ₦${(tx.amount / 100).toLocaleString()}`,
    }, session);

    await session.commitTransaction();

    notify.createNotification(tx.userId, {
      title: 'Wallet Funded 💰',
      body: `₦${(tx.amount / 100).toLocaleString()} added to your wallet via ${tx.meta?.provider}.`,
      type: 'wallet',
      meta: { reference },
    });

    return { outcome: 'credited', tx };
  } catch (err) {
    await session.abortTransaction();
    if (err.errorLabels?.includes('TransientTransactionError') && attempt < 3) {
      return completeWalletFund({ reference, providerAmountKobo, providerTransactionId, channel, attempt: attempt + 1 });
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ── Webhook Handlers ───────────────────────────────────────────────────

const handlePaystackWebhook = async (event) => {
  if (event.event !== 'charge.success') return;
  const { reference, amount, channel, id } = event.data;
  await completeWalletFund({ reference, providerAmountKobo: amount, providerTransactionId: id, channel });
};

const handleFlutterwaveWebhook = async (event) => {
  if (event.event !== 'charge.completed') return;
  if (event.data?.status !== 'successful') return;

  const { tx_ref, amount, currency, id } = event.data;
  if (currency !== 'NGN') return;

  await completeWalletFund({
    reference: tx_ref,
    providerAmountKobo: Math.round(amount * 100),
    providerTransactionId: id,
    channel: event.data.payment_type,
  });
};

const handleMonnifyWebhook = async (event) => {
  if (event.eventType !== 'SUCCESSFUL_TRANSACTION') return;
  const body = event.eventData;
  if (!body || body.paymentStatus !== 'PAID') return;

  await completeWalletFund({
    reference: body.paymentReference,
    providerAmountKobo: Math.round(body.amountPaid * 100),
    providerTransactionId: body.transactionReference,
    channel: body.paymentMethod,
  });
};

// ── Verify payment from callback page ─────────────────────────────────

const verifyPayment = async (provider, reference, transactionId) => {
  let result;

  if (provider === 'paystack') {
    const Paystack = require('../../providers/paystack/paystack.client');
    result = await Paystack.verifyTransaction(reference);
    if (result.data?.status !== 'success') throw new Error('Payment not successful');
    const completion = await completeWalletFund({
      reference,
      providerAmountKobo: result.data.amount,
      providerTransactionId: result.data.id,
      channel: result.data.channel,
    });
    if (completion.outcome === 'unknown') throw Object.assign(new Error('Unknown payment reference'), { statusCode: 404 });
    return { status: 'success', amount: result.data.amount / 100, channel: result.data.channel };
  }

  if (provider === 'flutterwave') {
    const Flutterwave = require('../../providers/flutterwave/flutterwave.client');
    result = transactionId
      ? await Flutterwave.verifyById(transactionId)
      : await Flutterwave.verifyByRef(reference);
    const tx = result.data;
    if (tx.status !== 'successful') throw new Error('Payment not successful');
    const completion = await completeWalletFund({
      reference: tx.tx_ref,
      providerAmountKobo: Math.round(tx.amount * 100),
      providerTransactionId: tx.id,
      channel: tx.payment_type,
    });
    if (completion.outcome === 'unknown') throw Object.assign(new Error('Unknown payment reference'), { statusCode: 404 });
    return { status: 'success', amount: tx.amount, channel: tx.payment_type };
  }

  if (provider === 'monnify') {
    const Monnify = require('../../providers/monnify/monnify.client');
    result = await Monnify.verifyTransaction(reference);
    const body = result.responseBody;
    if (body?.paymentStatus !== 'PAID') throw new Error('Payment not successful');
    const completion = await completeWalletFund({
      reference: body.paymentReference ?? reference,
      providerAmountKobo: Math.round(body.amountPaid * 100),
      providerTransactionId: body.transactionReference,
      channel: body.paymentMethod,
    });
    if (completion.outcome === 'unknown') throw Object.assign(new Error('Unknown payment reference'), { statusCode: 404 });
    return { status: 'success', amount: body.amountPaid, channel: body.paymentMethod };
  }

  throw Object.assign(new Error('Unknown provider'), { statusCode: 400 });
};

// ── Transfer ───────────────────────────────────────────────────────────

const transfer = async (senderId, recipientIdentifier, amountNGN, pin) => {
  const User = require('../../models/User');
  const sender = await User.findById(senderId).select('+pinHash');
  if (!sender) throw Object.assign(new Error('Sender not found'), { statusCode: 404 });

  const pinValid = await sender.comparePin(pin);
  if (!pinValid) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const isPhone = /^\+?[0-9]{10,14}$/.test(recipientIdentifier);
  const query = isPhone
    ? { 'phone.number': recipientIdentifier }
    : { 'email.address': recipientIdentifier.toLowerCase() };
  const recipient = await User.findOne(query);
  if (!recipient) throw Object.assign(new Error('Recipient not found'), { statusCode: 404 });
  if (sender._id.equals(recipient._id)) throw Object.assign(new Error('Cannot transfer to yourself'), { statusCode: 400 });

  const amountKobo = Math.round(amountNGN * 100);
  if (amountKobo < 10000) throw Object.assign(new Error('Minimum transfer is ₦100'), { statusCode: 400 });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { balanceBefore: senderBefore, balanceAfter: senderAfter, wallet: senderWallet } = await debit(senderId, amountKobo, session);
    const { balanceBefore: recipBefore, balanceAfter: recipAfter, wallet: recipWallet } = await credit(recipient._id, amountKobo, session);

    const debitRef  = otp.generateRef();
    const creditRef = otp.generateRef();

    const [debitTx] = await Transaction.create([{
      reference: debitRef, userId: senderId, walletId: senderWallet._id,
      type: 'wallet_transfer_debit', direction: 'debit',
      amount: amountKobo, status: 'success',
      balanceBefore: senderBefore, balanceAfter: senderAfter,
      meta: { counterpartyUserId: recipient._id, counterpartyName: `${recipient.firstName} ${recipient.lastName}` },
      processedAt: new Date(),
    }], { session });

    const [creditTx] = await Transaction.create([{
      reference: creditRef, userId: recipient._id, walletId: recipWallet._id,
      type: 'wallet_transfer_credit', direction: 'credit',
      amount: amountKobo, status: 'success',
      balanceBefore: recipBefore, balanceAfter: recipAfter,
      meta: { counterpartyUserId: sender._id, counterpartyName: `${sender.firstName} ${sender.lastName}` },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: debitTx._id, userId: senderId, walletId: senderWallet._id, entry: 'debit', amount: amountKobo, balanceBefore: senderBefore, balanceAfter: senderAfter, description: `Transfer to ${recipient.firstName} ${recipient.lastName}` }, session);
    await ledger.record({ transactionId: creditTx._id, userId: recipient._id, walletId: recipWallet._id, entry: 'credit', amount: amountKobo, balanceBefore: recipBefore, balanceAfter: recipAfter, description: `Transfer from ${sender.firstName} ${sender.lastName}` }, session);

    await session.commitTransaction();

    notify.createNotification(senderId, {
      title: 'Transfer Sent ✓',
      body: `₦${amountNGN.toLocaleString()} sent to ${recipient.firstName} ${recipient.lastName}.`,
      type: 'wallet', meta: { reference: debitRef },
    });
    notify.createNotification(recipient._id, {
      title: 'Money Received 💸',
      body: `₦${amountNGN.toLocaleString()} received from ${sender.firstName} ${sender.lastName}.`,
      type: 'wallet', meta: { reference: creditRef },
    });

    return { message: 'Transfer successful', reference: debitRef };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const getTransactions = async (userId, { page = 1, limit = 20, type, status } = {}) => {
  const query = { userId };
  if (type) query.type = type;
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(query),
  ]);
  return { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

module.exports = {
  getWallet, debit, credit,
  initiateWalletFund, verifyPayment, getOrCreateVirtualAccount,
  handlePaystackWebhook, handleFlutterwaveWebhook, handleMonnifyWebhook,
  transfer, getTransactions,
};
