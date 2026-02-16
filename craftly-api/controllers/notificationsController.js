import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

/**
 * GET /api/notifications/:userId
 * Fetch all notifications for a user
 * Uses Admin SDK - bypasses Firestore security rules
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  console.log(`🔔 Fetching notifications for user: ${userId}`);

  try {
    const notificationsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .get();

    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching notifications for user ${userId}:`, error);
    throw new ApiError(`Failed to fetch notifications: ${error.message}`, 500);
  }
});

/**
 * PUT /api/notifications/:userId/:notificationId/mark-as-read
 * Mark a notification as read
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { userId, notificationId } = req.params;

  if (!userId || !notificationId) {
    throw new ApiError('User ID and notification ID are required', 400);
  }

  console.log(`📖 Marking notification as read for user: ${userId}`);

  try {
    const notificationRef = db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    await notificationRef.update({
      isRead: true,
      readAt: new Date().toISOString(),
    });

    console.log(`✅ Notification marked as read: ${notificationId}`);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error(
      `❌ Error marking notification as read:`,
      error
    );
    throw new ApiError(`Failed to mark notification as read: ${error.message}`, 500);
  }
});

/**
 * PUT /api/notifications/:userId/mark-all-as-read
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  console.log(`📖 Marking all notifications as read for user: ${userId}`);

  try {
    const notificationsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .where('isRead', '==', false)
      .get();

    const batch = db.batch();

    notificationsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    });

    await batch.commit();

    console.log(
      `✅ All notifications marked as read for user ${userId}`
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error(`❌ Error marking all notifications as read:`, error);
    throw new ApiError(`Failed to mark all notifications as read: ${error.message}`, 500);
  }
});

/**
 * DELETE /api/notifications/:userId/:notificationId
 * Delete a notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { userId, notificationId } = req.params;

  if (!userId || !notificationId) {
    throw new ApiError('User ID and notification ID are required', 400);
  }

  console.log(`🗑️ Deleting notification for user: ${userId}`);

  try {
    const notificationRef = db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    await notificationRef.delete();

    console.log(`✅ Notification deleted: ${notificationId}`);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error(`❌ Error deleting notification:`, error);
    throw new ApiError(`Failed to delete notification: ${error.message}`, 500);
  }
});
