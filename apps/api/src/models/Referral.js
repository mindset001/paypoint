const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    bonusAmount: { type: Number },                 // kobo, snapshotted at credit time
    qualifyingTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    completedAt: Date,
  },
  { timestamps: true }
);

// refereeId already has unique:true — no separate index needed
referralSchema.index({ referrerId: 1, createdAt: -1 });

module.exports = mongoose.model('Referral', referralSchema);
