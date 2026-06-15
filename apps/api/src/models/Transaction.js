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
        'commission', 'cashback', 'referral_bonus', 'refund',
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
      meterNumber: String,
      token: String,
      examType: String,
      examPin: String,
      // Wallet funding
      paystackReference: String,
      paystackChannel: String,
      // Transfer
      counterpartyUserId: mongoose.Schema.Types.ObjectId,
      counterpartyName: String,
      narration: String,
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
transactionSchema.index({ providerReference: 1 });
transactionSchema.index({ 'meta.phone': 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
