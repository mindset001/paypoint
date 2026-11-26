const mongoose = require('mongoose');
const EsimAccess = require('../../providers/esim/esimAccess.client');
const EsimOrder = require('../../models/EsimOrder');
const Transaction = require('../../models/Transaction');
const walletService = require('../wallet/wallet.service');
const ledger = require('../../services/ledger.service');
const notify = require('../notifications/notifications.service');
const settings = require('../../services/settings.service');
const otp = require('../../utils/otp');

// Admin-configurable via Setting docs (settingsService) — sane defaults so
// pricing works the moment a provider key is added, without requiring the
// admin to configure anything first.
const DEFAULT_USD_TO_NGN_RATE = 1600;
const DEFAULT_MARKUP_PERCENT = 10;

const getPricingInputs = async () => {
  const [rate, markupPercent] = await Promise.all([
    settings.get('esim.usdToNgnRate', DEFAULT_USD_TO_NGN_RATE),
    settings.get('esim.markupPercent', DEFAULT_MARKUP_PERCENT),
  ]);
  return { rate, markupPercent };
};

const priceToNGNKobo = (priceUSD, rate, markupPercent) =>
  Math.round(priceUSD * rate * (1 + markupPercent / 100) * 100);

// Normalizes whatever shape the provider's package-list response has into
// what the frontend needs. Field names here are UNCONFIRMED (see
// esimAccess.client.js) — adjust once the real response shape is known.
const normalizePackage = (raw, rate, markupPercent) => ({
  packageCode: raw.packageCode,
  name: raw.name,
  countryCode: raw.locationCode,
  dataAllowanceMB: raw.volume,
  validityDays: raw.duration,
  priceUSD: raw.price,
  priceNGNKobo: priceToNGNKobo(raw.price, rate, markupPercent),
});

const getPackages = async (countryCode) => {
  if (!EsimAccess.isConfigured()) {
    throw Object.assign(new Error('eSIM is not available yet — check back soon'), { statusCode: 503 });
  }
  const { rate, markupPercent } = await getPricingInputs();
  const result = await EsimAccess.listPackages({ countryCode });
  const packages = result?.data ?? result?.packageList ?? [];
  return packages.map((p) => normalizePackage(p, rate, markupPercent));
};

const buy = async (userId, { packageCode, pin }) => {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!(await user.comparePin(pin))) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  // Checked before any wallet debit — an unconfigured provider must never
  // touch a real user's balance.
  if (!EsimAccess.isConfigured()) {
    throw Object.assign(new Error('eSIM is not available yet — check back soon'), { statusCode: 503 });
  }

  // Re-fetch the provider's own package list for the authoritative price —
  // never trust a client-supplied amount for what to charge (same rule as
  // every other buy flow in this app).
  const { rate, markupPercent } = await getPricingInputs();
  const result = await EsimAccess.listPackages({});
  const packages = result?.data ?? result?.packageList ?? [];
  const raw = packages.find((p) => p.packageCode === packageCode);
  if (!raw) throw Object.assign(new Error('Package not found'), { statusCode: 404 });
  const pkg = normalizePackage(raw, rate, markupPercent);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx, order;
  try {
    const { wallet, balanceBefore, balanceAfter } = await walletService.debit(userId, pkg.priceNGNKobo, session);

    const reference = otp.generateRef();
    [tx] = await Transaction.create([{
      reference, userId, walletId: wallet._id,
      type: 'esim', direction: 'debit', amount: pkg.priceNGNKobo, status: 'pending',
      balanceBefore, balanceAfter,
      meta: { narration: `eSIM: ${pkg.name}` },
    }], { session });

    [order] = await EsimOrder.create([{
      userId, transactionId: tx._id,
      packageCode: pkg.packageCode, packageName: pkg.name, countryCode: pkg.countryCode,
      priceNGNKobo: pkg.priceNGNKobo, priceUSD: pkg.priceUSD,
      dataAllowanceMB: pkg.dataAllowanceMB, validityDays: pkg.validityDays,
      status: 'pending',
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit',
      amount: pkg.priceNGNKobo, balanceBefore, balanceAfter,
      description: `eSIM: ${pkg.name}`,
    }, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Provider call happens outside the wallet transaction — a failure here
  // refunds via a separate credit rather than rolling back the debit, same
  // pattern as every provider-dependent purchase in this app.
  try {
    const orderResult = await EsimAccess.orderPackage({ packageCode: pkg.packageCode, transactionId: tx._id });
    const data = orderResult?.data ?? orderResult;

    order.providerOrderNo = data.orderNo;
    order.iccid = data.iccid;
    order.activationCode = data.ac;
    order.smdpStatus = data.smdpStatus;
    order.status = 'active';
    await order.save();

    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'success', processedAt: new Date(),
      'meta.esimOrderId': order._id, 'meta.iccid': data.iccid,
    });

    notify.createNotification(userId, {
      title: 'eSIM Ready 📶',
      body: `Your "${pkg.name}" eSIM is ready — scan the QR code in My eSIMs to install it.`,
      type: 'wallet', meta: { reference: tx.reference },
    });

    return { reference: tx.reference, orderId: order._id };
  } catch (err) {
    order.status = 'failed';
    await order.save();

    const { balanceBefore: revBefore, balanceAfter: revAfter } = await walletService.credit(userId, pkg.priceNGNKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, {
      status: 'failed', failureReason: err.message, balanceAfter: revAfter,
    });
    await ledger.record({
      transactionId: tx._id, userId, walletId: tx.walletId, entry: 'credit',
      amount: pkg.priceNGNKobo, balanceBefore: revBefore, balanceAfter: revAfter,
      description: `Refund: eSIM order failed (${pkg.name})`,
    });

    notify.createNotification(userId, {
      title: 'eSIM Purchase Failed',
      body: `Your "${pkg.name}" eSIM could not be issued — you've been refunded.`,
      type: 'wallet', meta: { reference: tx.reference },
    });

    throw err;
  }
};

const getMyEsims = async (userId) => EsimOrder.find({ userId }).sort({ createdAt: -1 });

const getEsim = async (userId, id) => {
  const order = await EsimOrder.findOne({ _id: id, userId });
  if (!order) throw Object.assign(new Error('eSIM not found'), { statusCode: 404 });
  return order;
};

const refreshStatus = async (userId, id) => {
  const order = await getEsim(userId, id);
  if (!order.iccid) throw Object.assign(new Error('This eSIM has no ICCID yet'), { statusCode: 400 });

  const result = await EsimAccess.getEsimStatus(order.iccid);
  const data = result?.data ?? result;

  order.smdpStatus = data.smdpStatus ?? order.smdpStatus;
  order.lastUsageBytes = data.orderUsage ?? order.lastUsageBytes;
  order.lastSyncedAt = new Date();
  await order.save();

  return order;
};

module.exports = { getPackages, buy, getMyEsims, getEsim, refreshStatus };
