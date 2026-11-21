const mongoose = require('mongoose');
const AidaPay = require('../../../providers/aidapay/aidapay.client');
const walletService = require('../../wallet/wallet.service');
const ledger = require('../../../services/ledger.service');
const fraud = require('../../../services/fraud.service');
const Transaction = require('../../../models/Transaction');
const otp = require('../../../utils/otp');
const referralService = require('../../referral/referral.service');
const cashbackService = require('../../../services/cashback.service');
const pricing = require('../../../services/pricing.service');

// AidaPay's provider_name strings for DisCos don't reliably contain the
// short codes this app's UI uses (e.g. "EKEDC" appears nowhere in their
// "Eko Electricity Distribution Company [PHCN]" listing, and KAEDC is just
// "Kaduna Electric") — resolving by name would wrongly reject both. Mapped
// directly from AidaPay's live GET /service/meter-token response instead
// of guessed.
const DISCO_PROVIDER_CODES = {
  IKEDC: 'ikedc',
  EKEDC: 'eedc',
  AEDC: 'aedc',
  KAEDC: 'kaduna',
  JED: 'jed',
  PHEDC: 'phed',
  KEDCO: 'kedco',
  BEDC: 'bedc',
  IBEDC: 'ibedc',
  ENUGU: 'enugu',
};

const resolveDiscoCode = (disco) => {
  const code = DISCO_PROVIDER_CODES[disco];
  if (!code) throw Object.assign(new Error(`${disco} is not available on AidaPay`), { statusCode: 400 });
  return code;
};

const verifyMeter = async (disco, meterNumber, meterType) => {
  const providerCode = resolveDiscoCode(disco);
  const { name } = await AidaPay.verifyRecipient(providerCode, meterNumber);
  return { name, address: '' };
};

// `amount` is what the meter is actually topped up with (sent to AidaPay
// as-is); the wallet is charged that plus the markup. Never trust a
// client-supplied "amount" as the final charge — it's the raw request.
const pay = async (userId, { disco, meterNumber, meterType, amount: rawAmount, phone, pin }) => {
  const User = require('../../../models/User');
  const user = await User.findById(userId).select('+pinHash');
  if (!await user.comparePin(pin)) throw Object.assign(new Error('Invalid PIN'), { statusCode: 403 });

  if (rawAmount < 500) throw Object.assign(new Error('Minimum electricity payment is ₦500'), { statusCode: 400 });
  const chargedAmount = pricing.priceFor(rawAmount, user);
  const amountKobo = Math.round(chargedAmount * 100);
  await fraud.checkVelocity(userId);

  const session = await mongoose.startSession();
  session.startTransaction();
  let tx;
  try {
    const { balanceBefore, balanceAfter, wallet } = await walletService.debit(userId, amountKobo, session);
    const ref = otp.generateRef();
    [tx] = await Transaction.create([{ reference: ref, userId, walletId: wallet._id, type: 'electricity', direction: 'debit', amount: amountKobo, status: 'pending', balanceBefore, balanceAfter, meta: { disco, meterNumber, meterType, marginAmount: amountKobo - Math.round(rawAmount * 100) }, processedAt: new Date() }], { session });
    await ledger.record({ transactionId: tx._id, userId, walletId: wallet._id, entry: 'debit', amount: amountKobo, balanceBefore, balanceAfter, description: `${disco} electricity ₦${rawAmount} → ${meterNumber}` }, session);
    await session.commitTransaction();
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }

  try {
    const providerCode = resolveDiscoCode(disco);
    const result = await AidaPay.buy({ recipient: meterNumber, providerCode, ref: tx.reference, amount: rawAmount });
    const txn = result.data?.data?.transaction_data;

    const charged = Number(txn?.amount_paid ?? txn?.amount);
    if (Number.isFinite(charged) && Math.abs(charged - rawAmount) > 0.5) {
      console.error(`[aidapay] price mismatch on ${disco} electricity ${tx.reference}: expected raw ₦${rawAmount}, AidaPay charged ₦${charged}`);
    }

    // AidaPay's /buy returns status "Processing" for meter tokens — the
    // token itself arrives later via webhook or GET /transaction/{hash}
    // (rate-limited, so not polled here), not synchronously in this response.
    // AidaPay's meter_token has come back with a stray leading ": " on at
    // least one real transaction — strip anything before the first digit.
    const token = txn?.meter_token ? txn.meter_token.replace(/^\D+/, '') : null;
    const units = txn?.meter_unit ?? null;
    await Transaction.findByIdAndUpdate(tx._id, {
      status: token ? 'success' : 'pending',
      providerReference: txn?.transaction_hash,
      providerStatus: txn?.status,
      providerResponse: result.data,
      'meta.token': token,
      'meta.units': units,
    });
    if (token) {
      referralService.creditReferralBonusIfQualifying(userId, tx._id)
        .catch((err) => console.error('[referral]', err));
      cashbackService.creditCashbackIfApplicable(userId, user.role, tx._id, amountKobo)
        .catch((err) => console.error('[cashback]', err));
    }
    return { message: token ? 'Electricity payment successful' : 'Electricity payment is processing', reference: tx.reference, token, units };
  } catch (providerErr) {
    const { balanceBefore: revBefore, balanceAfter: revAfter } = await walletService.credit(userId, amountKobo, null);
    await Transaction.findByIdAndUpdate(tx._id, { status: 'failed', failureReason: providerErr.message, balanceAfter: revAfter });
    await ledger.record({
      transactionId: tx._id, userId, walletId: tx.walletId, entry: 'credit',
      amount: amountKobo, balanceBefore: revBefore, balanceAfter: revAfter,
      description: `Refund: ${disco} electricity payment failed`,
    });
    throw Object.assign(new Error(`${providerErr.message} — your wallet has been reversed.`), { statusCode: 502 });
  }
};

module.exports = { verifyMeter, pay };
