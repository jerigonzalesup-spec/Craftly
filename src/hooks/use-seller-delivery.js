import { useState, useEffect, useRef } from 'react';

// In-memory cache for seller delivery methods with TTL (10 minutes)
const sellerDeliveryCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useSellerDelivery(sellerId) {
  const [sellerDelivery, setSellerDelivery] = useState({
    allowShipping: true, // default
    allowPickup: false,
  });
  const [loading, setLoading] = useState(!!sellerId);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = sellerDeliveryCache.get(sellerId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (isMountedRef.current) {
        setSellerDelivery(cached.data);
        setLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);

    // Fetch from API instead of Firestore
    (async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/orders/seller/${sellerId}/delivery-methods`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch delivery methods`);
        }

        const result = await response.json();
        const deliveryData = result.data || {
          allowShipping: true,
          allowPickup: false,
        };

        // Cache the result
        sellerDeliveryCache.set(sellerId, {
          data: deliveryData,
          timestamp: Date.now(),
        });

        if (isMountedRef.current) {
          setSellerDelivery(deliveryData);
          setError(null);
          console.log(`✅ Delivery methods fetched for seller ${sellerId}`);
        }
      } catch (err) {
        console.error(`Error fetching delivery methods for ${sellerId}:`, err);
        if (isMountedRef.current) {
          setError(err.message);
          // Set safe defaults on error
          setSellerDelivery({
            allowShipping: true,
            allowPickup: false,
          });
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [sellerId]);

  return { sellerDelivery, loading, error };
}
