const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const referralService = require('../../referral/referral.service');
const pricing = require('../../../services/pricing.service');

// AidaPay's data-bundle-sme catalog doesn't map one network to one
// provider_code — several networks offer more than one catalog under this
// service (different promos/tiers, or for MTN a completely different
// home-broadband product), and some don't resolve by plain network name at
// all. Mapped directly from their live GET /service/data-bundle-sme
// response, not guessed. First entry per network is the default.
const DATA_CATALOGS = {
  MTN: [
    { key: 'awuf',   label: 'Data Bundle',             providerCode: 'mtn-awuf-data' },
    { key: 'fibrex', label: 'FibreX (Home Broadband)',  providerCode: 'mtn-fibre-x' },
  ],
  Airtel: [
    { key: 'sme',  label: 'SME',  providerCode: 'airtel-sme-cg' },
    { key: 'awuf', label: 'AWUF', providerCode: 'airtel-awuf-data' },
  ],
  Glo: [
    { key: 'gifting', label: 'Gifting', providerCode: 'glo-gifting' },
  ],
};

const getCatalogs = (network) => {
  const catalogs = DATA_CATALOGS[network];
  if (!catalogs) throw Object.assign(new Error(`${network} is not available on AidaPay for this service`), { statusCode: 400 });
  return catalogs.map(({ key, label }) => ({ key, label }));
};

const resolveDataProviderCode = (network, catalogKey) => {
  const catalogs = DATA_CATALOGS[network];
  if (!catalogs) throw Object.assign(new Error(`${network} is not available on AidaPay for this service`), { statusCode: 400 });
  const catalog = catalogKey ? catalogs.find((c) => c.key === catalogKey) : catalogs[0];
  if (!catalog) throw Object.assign(new Error(`Unknown bundle type for ${network}`), { statusCode: 400 });
  return catalog.providerCode;
};

// AidaPay doesn't give a structured validity field — package_name is the
// only source (e.g. "MTN 6GB - 7 Days - AWUF Data", "MTN 2.5GB AWUF Daily").
// Parsed into a coarse bucket so the UI can filter a long list instead of
// dumping 20+ plans in one grid.
const categorizeValidity = (name) => {
  const lower = name.toLowerCase();
  const daysMatch = lower.match(/(\d+)\s*days?/);
  const monthsMatch = lower.match(/(\d+)\s*months?/);
  const yearsMatch = lower.match(/(\d+)\s*years?/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : null;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : null;

  if (yearsMatch || /\byearly\b|\bannual\b/.test(lower)) return 'Longer';
  if (months !== null) return months <= 1 ? 'Monthly' : 'Longer';
  if (/\bdaily\b/.test(lower) || days === 1) return 'Daily';
  if (/\bweekly\b/.test(lower) || (days !== null && days <= 13)) return 'Weekly';
  if (/\bmonthly\b/.test(lower) || (days !== null && days <= 45)) return 'Monthly';
  if (days !== null && days > 45) return 'Longer';
  return 'Other';
};

const getPlans = async (network, catalogKey, user) => {
  const providerCode = resolveDataProviderCode(network, catalogKey);
  const result = await AidaPay.getPackages(providerCode);
  const packages = result.data?.data ?? [];
  return packages.map((p) => ({
    planId: p.package_api_code,
    name: p.package_name,
    amount: pricing.priceFor(Number(p.package_amount), user),
    validity: categorizeValidity(p.package_name),
  }));
};

// Looks up a package's real AidaPay price directly — never trusts a
// client-supplied amount for what to charge. Without this, anyone could
// intercept their own request and pay the reseller (or any) rate.
const getRawPackagePrice = async (providerCode, planId) => {
  const result = await AidaPay.getPackages(providerCode);
  const pkg = (result.data?.data ?? []).find((p) => p.package_api_code === planId);
  if (!pkg) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  return Number(pkg.package_amount);
};

const buy = async (userId, { network, catalog, phone, planId, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid transaction PIN'), { statusCode: 403 });

  const providerCode = resolveDataProviderCode(network, catalog);
  const rawAmount = await getRawPackagePrice(providerCode, planId);
  const chargedAmount = pricing.priceFor(rawAmount, user);
  const amountKobo = Math.round(chargedAmount * 100);

  await fraud.checkVelocity(userId);
  await fraud.checkDuplicate(userId, 'data', { phone, amount: amountKobo });

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();

    [tx] = await Transaction.create([{
      reference: ref, userId, walletId: wallet._id,
      type: 'data', direction: 'debit', amount: amountKobo,
      status: 'pending', balanceBefore, balanceAfter,
      meta: { network, phone, dataBundle: planId },
      processedAt: new Date(),
    }], { session });

    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${network} data ${planId} → ${phone}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; }
  finally { session.endSession(); }

  try {
    const result = await AidaPay.buy({ recipient: phone, providerCode, ref: tx.reference, packageCode: planId });
    const txn = result.data?.data?.transaction_data;

    const charged = Number(txn?.amount_paid ?? txn?.amount);
    if (Number.isFinite(charged) && Math.abs(charged - rawAmount) > 0.5) {
      console.error(`[aidapay] price mismatch on ${network} data ${tx.reference}: expected raw ₦${rawAmount}, AidaPay charged ₦${charged}`);
    }

    await Transaction.findByIdAndUpdate(tx._id, { status: 'success', providerReference: txn?.transaction_hash, providerStatus: txn?.status, providerResponse: result.data });
    referralService.creditReferralBonusIfQualifying(userId, tx._id)
      .catch((err) => console.error('[referral]', err));
    return { message: 'Data purchased successfully', reference: tx.reference };
  } catch (providerErr) {
    await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message });
    throw Object.assign(new Error(`${providerErr.message} — your wallet has been reversed.`), { statusCode: 502 });
  }
};

module.exports = { getCatalogs, getPlans, buy };
