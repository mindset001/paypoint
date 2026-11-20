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

// CLIENT_URL may be a comma-separated allowlist (same convention app.js's
// CORS config uses) — a redirect can only target one URL, so take the first.
const PRIMARY_CLIENT_URL = (env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');

const CALLBACK_URL = (provider) =>
  `${PRIMARY_CLIENT_URL}/wallet/callback?provider=${provider}`;

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
        description: `Fund WavyPay wallet — ₦${amountNGN.toLocaleString()}`,
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
      paymentDescription: `WavyPay wallet funding — ₦${amountNGN.toLocaleString()}`,
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

// ── Internal: credit a deposit paid directly into a reserved/virtual ───
// account (bank transfer), which has no pending Transaction from
// initiateWalletFund to claim — resolve the wallet by the account
// reference/number Monnify echoes back instead.

const creditReservedAccountDeposit = async ({ accountReference, accountNumber, providerTransactionId, providerAmountKobo, channel, attempt = 1 }) => {
  const query = accountReference
    ? { 'reservedAccount.reference': accountReference }
    : { 'reservedAccount.accountNumber': accountNumber };
  const wallet = await Wallet.findOne(query);
  if (!wallet) return { outcome: 'unknown' };

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { balanceBefore, balanceAfter } = await credit(wallet.userId, providerAmountKobo, session);

    const ref = otp.generateRef();
    const [tx] = await Transaction.create([{
      reference: ref,
      userId: wallet.userId,
      walletId: wallet._id,
      type: 'wallet_fund',
      direction: 'credit',
      amount: providerAmountKobo,
      status: 'success',
      balanceBefore,
      balanceAfter,
      meta: { provider: 'monnify', channel },
      providerReference: providerTransactionId,
      providerStatus: 'success',
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id,
      userId: wallet.userId,
      walletId: wallet._id,
      entry: 'credit',
      amount: providerAmountKobo,
      balanceBefore,
      balanceAfter,
      description: `Wallet funded via monnify/${channel || 'bank_transfer'} — ₦${(providerAmountKobo / 100).toLocaleString()}`,
    }, session);

    await session.commitTransaction();

    notify.createNotification(wallet.userId, {
      title: 'Wallet Funded 💰',
      body: `₦${(providerAmountKobo / 100).toLocaleString()} added to your wallet via bank transfer.`,
      type: 'wallet',
      meta: { providerTransactionId },
    });

    return { outcome: 'credited', tx };
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) return { outcome: 'already_processed' }; // unique providerReference backstop
    if (err.errorLabels?.includes('TransientTransactionError') && attempt < 3) {
      return creditReservedAccountDeposit({ accountReference, accountNumber, providerTransactionId, providerAmountKobo, channel, attempt: attempt + 1 });
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ── Webhook Handlers ───────────────────────────────────────────────────

const handlePaystackWebhook = async (event) => {
  if (event.event === 'charge.success') {
    const { reference, amount, channel, id } = event.data;
    const result = await completeWalletFund({ reference, providerAmountKobo: amount, providerTransactionId: id, channel });
    if (result.outcome === 'unknown') {
      console.error('[wallet] paystack webhook: no matching transaction for reference', reference);
    }
    return;
  }

  if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
    await handleTransferWebhook(event);
  }
};

// Resolves a withdrawal left "pending" at initiation (Paystack's /transfer
// can come back "pending" or "otp" — business-side approval, not ours to
// automate around). Idempotent: a transaction that already left "pending"
// is a no-op, so a replayed webhook can't double-reverse a wallet credit.
const handleTransferWebhook = async (event) => {
  const { reference, status } = event.data;
  if (!reference) return;

  const tx = await Transaction.findOne({ reference, type: 'withdrawal' });
  if (!tx || tx.status !== 'pending') return;

  if (event.event === 'transfer.success') {
    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerStatus: status, providerResponse: event.data });
    notify.createNotification(tx.userId, {
      title: 'Withdrawal Successful ✓',
      body: `₦${(tx.amount / 100).toLocaleString()} sent to ${tx.meta?.bankName} ${tx.meta?.accountNumber}.`,
      type: 'wallet', meta: { reference: tx.reference },
    });
  } else {
    await credit(tx.userId, tx.amount, null);
    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'failed', providerStatus: status, providerResponse: event.data,
      failureReason: `Paystack reported: ${event.event}`,
    });
    notify.createNotification(tx.userId, {
      title: 'Withdrawal Failed',
      body: `Your withdrawal of ₦${(tx.amount / 100).toLocaleString()} could not be completed — your wallet has been refunded.`,
      type: 'wallet', meta: { reference: tx.reference },
    });
  }
};

const handleFlutterwaveWebhook = async (event) => {
  if (event.event !== 'charge.completed') return;
  if (event.data?.status !== 'successful') return;

  const { tx_ref, amount, currency, id } = event.data;
  if (currency !== 'NGN') return;

  const result = await completeWalletFund({
    reference: tx_ref,
    providerAmountKobo: Math.round(amount * 100),
    providerTransactionId: id,
    channel: event.data.payment_type,
  });
  if (result.outcome === 'unknown') {
    console.error('[wallet] flutterwave webhook: no matching transaction for reference', tx_ref);
  }
};

const handleMonnifyWebhook = async (event) => {
  if (event.eventType !== 'SUCCESSFUL_TRANSACTION') return;
  const body = event.eventData;
  if (!body || body.paymentStatus !== 'PAID') return;

  const result = await completeWalletFund({
    reference: body.paymentReference,
    providerAmountKobo: Math.round(body.amountPaid * 100),
    providerTransactionId: body.transactionReference,
    channel: body.paymentMethod,
  });

  if (result.outcome === 'unknown') {
    // Not a reference we initiated via /wallet/fund — likely a direct bank
    // transfer into the user's reserved account instead.
    const accountReference = body.product?.reference;
    const accountNumber = body.destinationAccountInformation?.accountNumber ?? body.accountDetails?.accountNumber;
    const fallback = await creditReservedAccountDeposit({
      accountReference,
      accountNumber,
      providerTransactionId: body.transactionReference,
      providerAmountKobo: Math.round(body.amountPaid * 100),
      channel: body.paymentMethod,
    });
    if (fallback.outcome === 'unknown') {
      console.error('[wallet] monnify webhook: could not resolve any wallet for payload', JSON.stringify(body));
    }
  }
};

// AidaPay sends this on any transaction status change ({type: "transaction"}).
// Mainly resolves meter-token purchases that came back "Processing" from the
// synchronous /buy call — the real token and final status arrive here.
// Status values per their docs: Completed, Processing, Pending, Refund, Cancelled.
const handleAidaPayWebhook = async (event) => {
  if (event?.type !== 'transaction' || !event.ref) return;
  const { ref, status, meter_token, meter_unit, transaction_hash } = event;

  const tx = await Transaction.findOne({ reference: ref });
  if (!tx || tx.status !== 'pending') return; // not ours, or already resolved — idempotent no-op

  if (status === 'Completed') {
    // AidaPay's meter_token has come back with a stray leading ": " on at
    // least one real transaction — strip anything before the first digit.
    const cleanToken = meter_token ? meter_token.replace(/^\D+/, '') : tx.meta?.token;
    const units = meter_unit ?? tx.meta?.units;

    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'success',
      providerStatus: status,
      providerReference: transaction_hash || tx.providerReference,
      providerResponse: event,
      'meta.token': cleanToken,
      'meta.units': units,
      processedAt: new Date(),
    });
    const referralService = require('../referral/referral.service');
    referralService.creditReferralBonusIfQualifying(tx.userId, tx._id)
      .catch((err) => console.error('[referral]', err));

    if (cleanToken) {
      notify.createNotification(tx.userId, {
        title: 'Electricity Token Ready ⚡',
        body: units ? `Your meter token: ${cleanToken} (${units} units)` : `Your meter token: ${cleanToken}`,
        type: 'transaction', meta: { reference: tx.reference },
      });
    }
  } else if (status === 'Cancelled' || status === 'Refund') {
    await credit(tx.userId, tx.amount, null);
    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'failed',
      providerStatus: status,
      providerResponse: event,
      failureReason: `AidaPay reported status: ${status}`,
    });
  }
  // Processing / Pending — still waiting, nothing to do yet.
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

// Name-enquiry lookup so the sender can see who they're paying before
// confirming — same identifier resolution transfer() uses, no money moves.
const verifyRecipient = async (senderId, recipientIdentifier) => {
  const User = require('../../models/User');
  const isPhone = /^\+?[0-9]{10,14}$/.test(recipientIdentifier);
  const query = isPhone
    ? { 'phone.number': recipientIdentifier }
    : { 'email.address': recipientIdentifier.toLowerCase() };

  const recipient = await User.findOne(query).select('firstName lastName');
  if (!recipient) throw Object.assign(new Error('No WavyPay account found with that phone/email'), { statusCode: 404 });
  if (senderId.toString() === recipient._id.toString()) {
    throw Object.assign(new Error('Cannot transfer to yourself'), { statusCode: 400 });
  }

  return { firstName: recipient.firstName, lastName: recipient.lastName };
};

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

// Distinct people this user has sent money to before, most-recent first —
// looked up fresh from User rather than trusting the identifier typed at
// the time, so a "send again" still works if they've since changed their
// phone/email.
const getRecentRecipients = async (userId, limit = 10) => {
  const User = require('../../models/User');
  const recent = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'wallet_transfer_debit', status: 'success' } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$meta.counterpartyUserId', lastTransferAt: { $first: '$createdAt' } } },
    { $sort: { lastTransferAt: -1 } },
    { $limit: limit },
  ]);

  const ids = recent.map((r) => r._id).filter(Boolean);
  const users = await User.find({ _id: { $in: ids } }).select('firstName lastName phone.number email.address');
  const byId = new Map(users.map((u) => [u._id.toString(), u]));

  return recent
    .map((r) => byId.get(r._id?.toString()))
    .filter(Boolean)
    .map((u) => ({
      userId: u._id,
      name: `${u.firstName} ${u.lastName}`,
      identifier: u.phone?.number || u.email?.address,
    }));
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

// Scoped to the requesting user — a reference alone isn't a capability token.
const getTransactionByReference = async (userId, reference) => {
  const tx = await Transaction.findOne({ userId, reference });
  if (!tx) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  return tx;
};

module.exports = {
  getWallet, debit, credit,
  initiateWalletFund, verifyPayment, getOrCreateVirtualAccount,
  handlePaystackWebhook, handleFlutterwaveWebhook, handleMonnifyWebhook, handleAidaPayWebhook,
  transfer, verifyRecipient, getRecentRecipients, getTransactions, getTransactionByReference,
};
