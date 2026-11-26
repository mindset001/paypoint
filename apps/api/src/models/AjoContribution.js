const mongoose = require('mongoose');

const ajoContributionSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'AjoPlan', required: true },
    cycleNumber: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountKobo: { type: Number, required: true },
    // 'forced' = creator marked it settled without collecting it (stall-mitigation override)
    status: { type: String, enum: ['pending', 'paid', 'forced'], default: 'pending' },
    paidAt: { type: Date },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    reminderSentAt: { type: Date }, // dedupes reminders to at most one per day
  },
  { timestamps: true }
);

ajoContributionSchema.index({ planId: 1, cycleNumber: 1, userId: 1 }, { unique: true });
ajoContributionSchema.index({ status: 1 });

module.exports = mongoose.model('AjoContribution', ajoContributionSchema);
