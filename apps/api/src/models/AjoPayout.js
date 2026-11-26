const mongoose = require('mongoose');

const ajoPayoutSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'AjoPlan', required: true },
    cycleNumber: { type: Number, required: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountKobo: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: { type: Date },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

ajoPayoutSchema.index({ planId: 1, cycleNumber: 1 }, { unique: true });

module.exports = mongoose.model('AjoPayout', ajoPayoutSchema);
