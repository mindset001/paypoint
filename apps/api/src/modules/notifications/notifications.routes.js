const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const ctrl = require('./notifications.controller');

router.get('/',              authenticate, ctrl.getNotifications);
router.get('/unread-count',  authenticate, ctrl.getUnreadCount);
router.patch('/read-all',    authenticate, ctrl.markAllRead);
router.patch('/:id/read',    authenticate, ctrl.markAsRead);

module.exports = router;
