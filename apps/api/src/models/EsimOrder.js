const mongoose = require('mongoose');

const esimOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    packageCode: { type: String, required: true },
    packageName: { type: String, required: true },
    countryCode: { type: String, required: true },
    priceNGNKobo: { type: Number, required: true },
    priceUSD: { type: Number, required: true }, // provider's raw price, snapshotted at purchase time
    providerOrderNo: { type: String },
    iccid: { type: String },
    activationCode: { type: String }, // the "ac" LPA string — rendered as a QR client-side
    dataAllowanceMB: { type: Number },
    validityDays: { type: Number },
    smdpStatus: { type: String },
    lastUsageBytes: { type: Number },
    lastSyncedAt: { type: Date },
    status: { type: String, enum: ['pending', 'active', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

esimOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EsimOrder', esimOrderSchema);
