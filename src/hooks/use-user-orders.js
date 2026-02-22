import { useState, useEffect, useRef, useCallback } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry, invalidateCache } from '@/lib/cacheUtils';

// In-memory cache for user orders with TTL (2 minutes)
const ordersCache = new Map();
const ORDER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Function to clear orders cache (exported for use in checkout)
export function clearOrdersCache(userId) {
  ordersCache.delete(userId);
  console.log(`🗑️ Orders cache cleared for user ${userId}`);
}

export function useUserOrders(userId) {
  const [orders, setOrders] = useState([]);
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

  // Define fetchOrders FIRST so it can be used in other effects
  const fetchOrders = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setOrders([]);
        setLoading(false);
      }
      return;
    }

    // Check cache first
    const cached = ordersCache.get(userId);
    if (isCacheValid(cached, ORDER_CACHE_TTL)) {
      const age = getCacheAge(cached);
      console.log(`📦 Using cached orders for user ${userId} (age: ${age}s)`);
      if (isMountedRef.current) {
        setOrders(cached.data || []);
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
      const response = await fetch(`${API_URL}/api/orders/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch orders`);
      }

      const data = await response.json();
      const ordersData = data.data?.orders || [];

      // Cache the results
      ordersCache.set(userId, createCacheEntry(ordersData));

      if (isMountedRef.current) {
        setOrders(ordersData);
        setError(null);
        console.log(`✅ Loaded ${ordersData.length} orders`);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setOrders([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Check for order placement flag AFTER fetchOrders is defined
  useEffect(() => {
    if (!userId) return;
    const orderPlacedKey = `orderJustPlaced_${userId}`;
    const orderPlaced = localStorage.getItem(orderPlacedKey);
    if (orderPlaced) {
      console.log(`📢 Order was just placed for user ${userId}, clearing cache and refetching...`);
      clearOrdersCache(userId);
      localStorage.removeItem(orderPlacedKey);
      
      // Wait 500ms for Firestore write to complete, then refetch
      const timer = setTimeout(() => {
        console.log(`⚡ Fetching fresh orders after order placement...`);
        fetchOrders();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [userId, fetchOrders]);

  // Initial fetch when userId changes
  useEffect(() => {
    fetchOrders();
  }, [userId, fetchOrders]);

  const clearOrderCache = useCallback(() => {
    invalidateCache(ordersCache, userId);
    console.log(`🔄 Orders cache invalidated for user ${userId}`);
  }, [userId]);

  return { orders, loading, error, isCached, invalidateCache: clearOrderCache, refetch: fetchOrders };
}
