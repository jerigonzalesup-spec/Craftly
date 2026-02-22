import { useState, useCallback, useEffect, useRef } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry } from '@/lib/cacheUtils';

// In-memory cache for product stats with TTL (5 minutes)
const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Batch request queue
const batchQueue = new Map(); // Map of productId -> { resolve, reject }
let batchTimeoutId = null;
const BATCH_DELAY = 100; // Wait 100ms to collect stats requests before sending batch

export function useProductStats(productId) {
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    salesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = statsCache.get(productId);
    if (isCacheValid(cached, CACHE_TTL)) {
      console.log(`✅ Using cached stats for product ${productId}`);
      setStats(cached.data);
      setLoading(false);
      setIsCached(true);
      return;
    }

    setLoading(true);
    setError(null);
    setIsCached(false);

    // Add to batch queue
    return new Promise((resolve, reject) => {
      batchQueue.set(productId, { resolve, reject });

      // Clear existing timeout if any
      if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
      }

      // If we have enough items or it's time, send the batch
      if (batchQueue.size >= 5) {
        sendBatch();
      } else {
        // Otherwise, schedule a batch send after a short delay
        batchTimeoutId = setTimeout(() => {
          sendBatch();
          batchTimeoutId = null;
        }, BATCH_DELAY);
      }
    });
  }, [productId]);

  const sendBatch = useCallback(async () => {
    if (batchQueue.size === 0) return;

    const productIds = Array.from(batchQueue.keys());
    const requests = Array.from(batchQueue.values());

    console.log(`📦 Sending batch stats request for ${productIds.length} products`);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/products/batch/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch batch stats`);
      }

      const data = await response.json();
      const statsData = data.data || {};

      // Update cache and resolve each promise
      productIds.forEach((pid, index) => {
        const pidStats = statsData[pid] || {
          averageRating: 0,
          reviewCount: 0,
          salesCount: 0,
        };

        // Cache the stats
        statsCache.set(pid, createCacheEntry(pidStats));

        // Resolve the promise for this product
        const { resolve } = requests[index];
        resolve(pidStats);
      });

      console.log(`✅ Batch stats fetched for ${productIds.length} products`);
    } catch (error) {
      console.error(`❌ Error fetching batch stats:`, error);
      // Reject all promises in the batch
      requests.forEach(({ reject }) => {
        reject(error);
      });
    }

    // Clear the batch queue
    batchQueue.clear();
  }, []);

  useEffect(() => {
    fetchStats()
      .then((result) => {
        if (result) {
          setStats(result);
          setError(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(`❌ Error fetching stats for ${productId}:`, err);
        setError(err.message);
        setLoading(false);
        // Set default stats on error
        setStats({
          averageRating: 0,
          reviewCount: 0,
          salesCount: 0,
        });
      });
  }, [productId, fetchStats]);

  return { stats, loading, error, isCached };
}
