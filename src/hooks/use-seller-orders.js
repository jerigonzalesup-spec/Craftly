import { useState, useEffect, useRef, useCallback } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry, invalidateCache } from '@/lib/cacheUtils';

// In-memory cache for seller orders with TTL (1 second for real-time updates)
const sellerOrdersCache = new Map();
const SELLER_ORDERS_CACHE_TTL = 1 * 1000; // 1 second - fast fresh data

export function useSellerOrders(sellerId) {
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

  const fetchOrders = useCallback(async () => {
    if (!sellerId) {
      if (isMountedRef.current) {
        setOrders([]);
        setLoading(false);
      }
      return;
    }

    // Check cache first
    const cached = sellerOrdersCache.get(sellerId);
    if (isCacheValid(cached, SELLER_ORDERS_CACHE_TTL)) {
      const age = getCacheAge(cached);
      console.log(`📦 Using cached seller orders for ${sellerId} (age: ${age}s)`);
      if (isMountedRef.current) {
        setOrders(cached.data);
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
      const response = await fetch(`${API_URL}/api/orders/seller/${sellerId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch seller orders`);
      }

      const data = await response.json();
      const ordersData = data.data?.orders || [];

      // DEBUG: Log orders structure including sellerTotal
      if (ordersData.length > 0) {
        console.log(`📋 Seller Orders API Response - First order:`, {
          orderId: ordersData[0].id,
          paymentStatus: ordersData[0].paymentStatus,
          sellerTotal: ordersData[0].sellerTotal,
          sellerItemsCount: ordersData[0].sellerItems?.length,
          itemsCount: ordersData[0].items?.length,
        });
      }

      // Cache the results
      sellerOrdersCache.set(sellerId, createCacheEntry(ordersData));

      if (isMountedRef.current) {
        setOrders(ordersData);
        setError(null);
        console.log(`✅ Loaded ${ordersData.length} seller orders (cached for next 1 sec)`);
      }
    } catch (err) {
      console.error('Error fetching seller orders:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setOrders([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sellerId]);

  useEffect(() => {
    fetchOrders();
  }, [sellerId, fetchOrders]);

  const clearSellerOrdersCache = useCallback(() => {
    invalidateCache(sellerOrdersCache, sellerId);
    console.log(`🔄 Seller orders cache invalidated for ${sellerId}`);
  }, [sellerId]);

  return { orders, loading, error, isCached, invalidateCache: clearSellerOrdersCache, refetch: fetchOrders };
}
