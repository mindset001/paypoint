const mongoose = require('mongoose');

// Append-only — never update or delete entries
const ledgerSchema = new mongoose.Schema(
  {
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    entry: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true },       // in kobo
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ledgerSchema.index({ walletId: 1, createdAt: -1 });
ledgerSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
