const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: {
      type: String,
      enum: [
        'airtime', 'data', 'cable', 'electricity', 'exam',
        'wallet_fund', 'wallet_transfer_debit', 'wallet_transfer_credit',
        'commission', 'cashback', 'referral_bonus', 'refund', 'savings', 'withdrawal',
      ],
      required: true,
    },
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true },       // in kobo
    fee: { type: Number, default: 0 },              // in kobo
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'reversed'],
      default: 'pending',
    },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    meta: {
      // VTU
      network: String,
      phone: String,
      dataBundle: String,
      cableProvider: String,
      smartcardNumber: String,
      disco: String,
      meterNumber: String,
      meterType: String,
      token: String,
      units: String,
      examType: String,
      examPin: String,
      marginAmount: Number, // kobo — chargedAmount minus AidaPay's raw cost, 0 for resellers
      // Wallet funding
      provider: String,
      channel: String,
      // Transfer
      counterpartyUserId: mongoose.Schema.Types.ObjectId,
      counterpartyName: String,
      narration: String,
      // Bank withdrawal
      bankName: String,
      accountNumber: String,
      // Referral
      refereeId: mongoose.Schema.Types.ObjectId,
      // Cashback
      sourceTransactionId: mongoose.Schema.Types.ObjectId,
      cashbackRate: Number, // percent, e.g. 1.5, as applied at the time
    },
    providerReference: String,
    providerStatus: String,
    providerResponse: mongoose.Schema.Types.Mixed,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    processedAt: Date,
  },
  { timestamps: true }
);

// reference already has unique:true — skip duplicate index declaration
// transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, userId: 1 });
// unique+sparse: backstops idempotency for completion paths that have no
// pre-existing pending row to atomically claim (e.g. reserved-account
// deposits) — a concurrent duplicate insert hits this instead of double-crediting
transactionSchema.index({ providerReference: 1 }, { unique: true, sparse: true });
transactionSchema.index({ 'meta.phone': 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
