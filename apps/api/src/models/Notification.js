const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body:  { type: String, required: true },
    type:  {
      type: String,
      enum: ['transaction', 'security', 'promo', 'system', 'wallet'],
      default: 'system',
    },
    read:      { type: Boolean, default: false },
    readAt:    { type: Date },
    meta:      { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
