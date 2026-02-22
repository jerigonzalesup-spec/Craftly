import { useState, useEffect, useCallback, useRef } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry, invalidateCache } from '@/lib/cacheUtils';

// Client-side cache for product lists with long TTL (15 minutes)
const productListCache = new Map();
const PRODUCT_LIST_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function useProducts(createdBy = null) {
  const [products, setProducts] = useState([]);
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

  useEffect(() => {
    if (!isMountedRef.current) return;

    const fetchProducts = async () => {
      const cacheKey = createdBy ? `seller_${createdBy}` : 'all_products';

      // Check client-side cache first
      const cached = productListCache.get(cacheKey);
      if (isCacheValid(cached, PRODUCT_LIST_CACHE_TTL)) {
        const age = getCacheAge(cached);
        console.log(`✅ Using cached products for ${cacheKey} (age: ${age}s)`);
        if (isMountedRef.current) {
          setProducts(cached.data);
          setLoading(false);
          setIsCached(true);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setIsCached(false);

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const url = createdBy 
          ? `${API_URL}/api/products?createdBy=${createdBy}`
          : `${API_URL}/api/products`;

        console.log(`📦 Fetching products from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch products`);
        }

        const data = await response.json();
        const productsData = data.data || [];

        // Cache the results
        productListCache.set(cacheKey, createCacheEntry(productsData));

        if (isMountedRef.current) {
          setProducts(productsData);
          setError(null);
          console.log(`✅ Loaded ${productsData.length} products (cached for next 15 min)`);
        }
      } catch (err) {
        console.error(`❌ Error fetching products:`, err);
        if (isMountedRef.current) {
          setError(err.message);
          setProducts([]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
  }, [createdBy]);

  // Function to manually invalidate cache (e.g., after creating a product)
  const clearProductCache = useCallback(() => {
    const cacheKey = createdBy ? `seller_${createdBy}` : 'all_products';
    invalidateCache(productListCache, cacheKey);
    console.log(`🔄 Product cache invalidated for ${cacheKey}`);
  }, [createdBy]);

  return { products, loading, error, isCached, invalidateCache: clearProductCache };
}
