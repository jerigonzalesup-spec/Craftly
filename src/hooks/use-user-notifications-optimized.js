import { useState, useEffect, useRef, useCallback } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry, invalidateCache } from '@/lib/cacheUtils';

// In-memory cache for notifications with LONG TTL (30 minutes due to lower change frequency)
const notificationsCache = new Map();
const NOTIFICATIONS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (can wait longer for notifications)

export function useUserNotificationsOptimized(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setNotifications([]);
        setLoading(false);
      }
      return;
    }

    // Check cache first - saves MASSIVE quota
    const cached = notificationsCache.get(userId);
    if (isCacheValid(cached, NOTIFICATIONS_CACHE_TTL)) {
      const age = getCacheAge(cached);
      console.log(`🔔 Using cached notifications (age: ${age}s, saves quota)`);
      if (isMountedRef.current) {
        setNotifications(cached.data);
        setLoading(false);
        setIsCached(true);
        setError(null);
      }
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    setIsCached(false);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/${userId}`);

      if (!response.ok) {
        // Return cached data if available on error instead of empty list
        if (cached) {
          if (isMountedRef.current) {
            setNotifications(cached.data);
            setError(null);
            setLoading(false);
          }
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch notifications`);
      }

      const data = await response.json();
      const notificationsData = data.data?.notifications || [];

      // Cache the results aggressively
      notificationsCache.set(userId, createCacheEntry(notificationsData));

      if (isMountedRef.current) {
        setNotifications(notificationsData);
        setError(null);
        console.log(`✅ Loaded ${notificationsData.length} notifications (cached for 30 min)`);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setNotifications([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [userId, fetchNotifications]);

  const clearNotificationsCache = useCallback(() => {
    invalidateCache(notificationsCache, userId);
    console.log(`🔄 Notifications cache invalidated`);
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(
          `${API_URL}/api/notifications/${userId}/${notificationId}/mark-as-read`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }

        // Invalidate cache so next fetch gets fresh data
        clearNotificationsCache();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [userId, clearNotificationsCache]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/${userId}/mark-all-as-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Invalidate cache so next fetch gets fresh data
      clearNotificationsCache();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId, clearNotificationsCache]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!userId) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(
          `${API_URL}/api/notifications/${userId}/${notificationId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete notification');
        }

        // Invalidate cache so next fetch gets fresh data
        clearNotificationsCache();
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    },
    [userId, clearNotificationsCache]
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    loading,
    error,
    isCached,
    unreadCount,
    invalidateCache: clearNotificationsCache,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
