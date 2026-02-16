
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';

export function useNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollIntervalRef = useRef(null);

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async () => {
    if (!user || !user.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/${user.uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.data.notifications || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
      // Don't show toast for fetch errors on initial load
    }
  }, [user]);

  // Set up polling for notifications (every 3 seconds)
  useEffect(() => {
    if (!user || !user.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch immediately
    fetchNotifications();

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      fetchNotifications();
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user, fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user || !user.uid) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(
          `${API_URL}/api/notifications/${user.uid}/${notificationId}/mark-as-read`,
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

        // Update local state immediately for better UX
        setNotifications((prevNotifs) =>
          prevNotifs.map((notif) =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user || !user.uid || unreadCount === 0) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${API_URL}/api/notifications/${user.uid}/mark-all-as-read`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state immediately
      setNotifications((prevNotifs) =>
        prevNotifs.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user, unreadCount]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!user || !user.uid) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(
          `${API_URL}/api/notifications/${user.uid}/${notificationId}`,
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

        // Update local state immediately
        setNotifications((prevNotifs) =>
          prevNotifs.filter((notif) => notif.id !== notificationId)
        );
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    },
    [user]
  );

  return { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading };
}

