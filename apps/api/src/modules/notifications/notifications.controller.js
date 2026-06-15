const svc = require('./notifications.service');
const { success, error } = require('../../utils/response');

const getNotifications = async (req, res) => {
  try {
    const { page, limit, unread } = req.query;
    const data = await svc.getNotifications(req.user._id, {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 50),
      unreadOnly: unread === 'true',
    });
    return success(res, data, 'Notifications fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await svc.getUnreadCount(req.user._id);
    return success(res, { count }, 'Unread count');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await svc.markAsRead(req.user._id, req.params.id);
    if (!notification) return error(res, 'Not found', 404);
    return success(res, notification, 'Marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    const data = await svc.markAllRead(req.user._id);
    return success(res, data, 'All marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllRead };
