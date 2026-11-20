const mongoose = require('mongoose');

// Append-only — never update or delete entries
const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. 'user.status.update', 'kyc.approve'
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    reason: String,
    ip: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
