import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

// Server-side notifications cache to reduce Firestore quota
const notificationsCache = new Map();
const NOTIFICATIONS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Cache entry structure: { data: notifications, timestamp: Date, unreadCount: number }
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = new Date().getTime();
  return now - cacheEntry.timestamp < NOTIFICATIONS_CACHE_TTL;
};

const invalidateNotificationsCache = (userId) => {
  notificationsCache.delete(userId);
  console.log(`🗑️ Invalidated notifications cache for user: ${userId}`);
};

/**
 * GET /api/notifications/:userId
 * Fetch all notifications for a user
 * Uses Admin SDK - bypasses Firestore security rules
 * Implements 15-minute server-side caching to reduce Firestore quota
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  console.log(`🔔 Fetching notifications for user: ${userId}`);

  try {
    // Check cache first before querying Firestore
    const cachedData = notificationsCache.get(userId);
    if (isCacheValid(cachedData)) {
      console.log(`✅ Cache HIT for user ${userId} notifications (age: ${Math.round((new Date().getTime() - cachedData.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: {
          notifications: cachedData.data,
          unreadCount: cachedData.unreadCount,
          fromCache: true,
        },
      });
    }

    // Check if user exists first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`ℹ️ User ${userId} not found, returning empty notifications`);
      return res.status(200).json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
        },
      });
    }

    const notificationsRef = db
      .collection('users')
      .doc(userId)
      .collection('notifications');

    // Check if notifications sub-collection exists
    const notificationsSnapshot = await notificationsRef
      .orderBy('createdAt', 'desc')
      .get();

    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Cache the results
    notificationsCache.set(userId, {
      data: notifications,
      unreadCount,
      timestamp: new Date().getTime(),
    });

    console.log(`📦 Cache MISS - Fresh fetch: ${notifications.length} notifications for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching notifications for user ${userId}:`, error);
    // Return empty notifications instead of error to prevent UI breakdown
    if (error.message && error.message.includes('No documents to sort')) {
      return res.status(200).json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
        },
      });
    }
    throw new ApiError(`Failed to fetch notifications: ${error.message}`, 500);
  }
});

/**
 * PUT /api/notifications/:userId/:notificationId/mark-as-read
 * Mark a notification as read
 * Invalidates cache to ensure next fetch gets updated data
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

    // Invalidate cache so next fetch gets updated data
    invalidateNotificationsCache(userId);

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
 * Invalidates cache to ensure next fetch gets updated data
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

    // Invalidate cache so next fetch gets updated data
    invalidateNotificationsCache(userId);

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
 * Invalidates cache to ensure next fetch gets updated data
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

    // Invalidate cache so next fetch gets updated data
    invalidateNotificationsCache(userId);

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
