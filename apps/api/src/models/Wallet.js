const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0 },    // stored in kobo
    currency: { type: String, default: 'NGN' },
    tier: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
    },
    dailySpendLimit: { type: Number, default: 5000000 },    // ₦50,000 in kobo
    weeklySpendLimit: { type: Number, default: 20000000 },  // ₦200,000 in kobo
    totalFunded: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    frozenAmount: { type: Number, default: 0 },
    reservedAccount: {
      provider:       { type: String },          // 'monnify'
      accountNumber:  { type: String },
      accountName:    { type: String },
      bankName:       { type: String },
      bankCode:       { type: String },
      reference:      { type: String },          // accountReference
      createdAt:      { type: Date },
    },
  },
  { timestamps: true }
);

// userId already has unique:true — no separate index needed

walletSchema.methods.getBalanceNGN = function () {
  return this.balance / 100;
};

module.exports = mongoose.model('Wallet', walletSchema);
