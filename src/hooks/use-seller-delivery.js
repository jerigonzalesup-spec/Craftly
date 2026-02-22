import { useState, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase/provider';
import { doc, getDocs, collection } from 'firebase/firestore';
import { isCacheValid, createCacheEntry } from '@/lib/cacheUtils';

// In-memory cache for seller delivery methods with TTL (10 minutes)
const sellerDeliveryCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Batch request queue for Firestore reads
const sellerBatchQueue = new Map(); // Map of sellerId -> { resolve, reject }
let batchTimeoutId = null;
const BATCH_DELAY = 150; // Wait 150ms to collect seller requests before executing batch

export function useSellerDelivery(sellerId) {
  const [sellerDelivery, setSellerDelivery] = useState({
    allowShipping: true, // default
    allowPickup: false,
  });
  const [loading, setLoading] = useState(!!sellerId);
  const [error, setError] = useState(null);
  const firestore = useFirestore();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sellerId || !firestore) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = sellerDeliveryCache.get(sellerId);
    if (isCacheValid(cached, CACHE_TTL)) {
      if (isMountedRef.current) {
        setSellerDelivery(cached.data);
        setLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);

    // Add to batch queue
    const promise = new Promise((resolve, reject) => {
      sellerBatchQueue.set(sellerId, { resolve, reject, firestore });

      // Clear existing timeout if any
      if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
      }

      // If we have enough items, send the batch immediately
      if (sellerBatchQueue.size >= 8) {
        executeBatch();
      } else {
        // Otherwise, schedule batch execution after a delay
        batchTimeoutId = setTimeout(() => {
          executeBatch();
          batchTimeoutId = null;
        }, BATCH_DELAY);
      }
    });

    promise
      .then((data) => {
        if (isMountedRef.current) {
          setSellerDelivery(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error(`Error fetching seller delivery methods for ${sellerId}:`, err);
          setError(err.message);
          // Set safe defaults on error
          setSellerDelivery({
            allowShipping: true,
            allowPickup: false,
          });
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });
  }, [sellerId, firestore]);

  return { sellerDelivery, loading, error };
}

/**
 * Execute batch fetch for all queued sellers
 */
async function executeBatch() {
  if (sellerBatchQueue.size === 0) return;

  const sellerIds = Array.from(sellerBatchQueue.keys());
  const requests = Array.from(sellerBatchQueue.values());
  const firestore = requests[0]?.firestore;

  if (!firestore) {
    sellerBatchQueue.clear();
    return;
  }

  console.log(`👥 Fetching delivery methods for ${sellerIds.length} sellers`);

  try {
    // Batch fetch all seller documents
    const sellerDataMap = new Map();

    for (const sellerId of sellerIds) {
      try {
        // Try to get from Firestore (need to do individual gets, but we batch them)
        // This is still better than doing them in component useEffects
        const sellerRef = doc(firestore, 'users', sellerId);
        
        // We can't batch getDocs-style calls for individual documents,
        // but we can at least do them all quickly in sequence rather than spread across components
        const sellerSnap = await import('firebase/firestore').then(
          ({ getDoc }) => getDoc(sellerRef)
        );

        if (sellerSnap.exists()) {
          const data = sellerSnap.data();
          sellerDataMap.set(sellerId, {
            allowShipping: data.allowShipping !== false,
            allowPickup: data.allowPickup === true,
          });
        } else {
          // Default values if seller not found
          sellerDataMap.set(sellerId, {
            allowShipping: true,
            allowPickup: false,
          });
        }
      } catch (error) {
        console.error(`Error fetching seller ${sellerId}:`, error);
        // Set safe defaults on error
        sellerDataMap.set(sellerId, {
          allowShipping: true,
          allowPickup: false,
        });
      }
    }

    // Cache and resolve all promises
    sellerIds.forEach((sellerId, index) => {
      const sellerData = sellerDataMap.get(sellerId) || {
        allowShipping: true,
        allowPickup: false,
      };

      // Cache the data
      sellerDeliveryCache.set(sellerId, createCacheEntry(sellerData));

      // Resolve the promise for this seller
      const { resolve } = requests[index];
      resolve(sellerData);
    });

    console.log(`✅ Delivery methods fetched for ${sellerIds.length} sellers`);
  } catch (error) {
    console.error(`❌ Error in batch seller fetch:`, error);
    // Reject all promises with error
    requests.forEach(({ reject }) => {
      reject(error);
    });
  }

  // Clear the batch queue
  sellerBatchQueue.clear();
}
