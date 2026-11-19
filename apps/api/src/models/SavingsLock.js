const mongoose = require('mongoose');

const savingsLockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true },   // kobo — fixed principal for the life of the lock
    status: { type: String, enum: ['active', 'withdrawn'], default: 'active' },
    startDate: { type: Date, required: true, default: Date.now },
    maturityDate: { type: Date, required: true },
    withdrawnAt: { type: Date },
  },
  { timestamps: true }
);

savingsLockSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SavingsLock', savingsLockSchema);
