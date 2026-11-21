const mongoose = require('mongoose');

// Log of broadcast sends — the actual delivery to each user is a fan-out of
// Notification documents (see admin.service.js#sendAnnouncement); this is
// just the admin-facing history of what was sent, by whom, and to how many.
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    displayType: { type: String, enum: ['notification', 'popup'], default: 'notification' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
