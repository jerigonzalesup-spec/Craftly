import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notificationsController.js';

const router = express.Router();

/**
 * Notifications Routes
 */

// Get all notifications for a user
router.get('/:userId', getUserNotifications);

// Mark a specific notification as read
router.put('/:userId/:notificationId/mark-as-read', markNotificationAsRead);

// Mark all notifications as read for a user
router.put('/:userId/mark-all-as-read', markAllNotificationsAsRead);

// Delete a notification
router.delete('/:userId/:notificationId', deleteNotification);

export default router;
