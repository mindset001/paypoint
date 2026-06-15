const Notification = require('../../models/Notification');

const getNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const skip = (page - 1) * limit;
  const filter = { userId, ...(unreadOnly ? { read: false } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return { notifications, total, unreadCount, page, limit, pages: Math.ceil(total / limit) };
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

const markAsRead = async (userId, notificationId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

const markAllRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  return { updated: result.modifiedCount };
};

// Internal helper — called by other services when events occur
const createNotification = async (userId, { title, body, type = 'system', meta = {} }) => {
  try {
    return await Notification.create({ userId, title, body, type, meta });
  } catch {
    // Never let notification creation break the main flow
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllRead, createNotification };
