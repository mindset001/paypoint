const AuditLog = require('../models/AuditLog');

// Fire-and-forget by design — an audit-log write failing should never block
// the admin action it's recording.
const record = ({ adminId, action, targetUserId, targetTransactionId, before, after, reason, ip }) => {
  AuditLog.create({ adminId, action, targetUserId, targetTransactionId, before, after, reason, ip })
    .catch((err) => console.error('[audit] failed to record', action, err.message));
};

module.exports = { record };
