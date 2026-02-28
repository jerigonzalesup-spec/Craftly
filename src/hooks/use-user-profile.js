import { useState, useEffect, useRef, useCallback } from 'react';
import { isCacheValid, getCacheAge, createCacheEntry, invalidateCache } from '@/lib/cacheUtils';

// In-memory cache for user profiles with TTL (10 minutes)
const userProfileCache = new Map();
const USER_PROFILE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setProfile(null);
        setLoading(false);
        setProductsLoading(false);
      }
      return;
    }

    // Check cache first
    const cached = userProfileCache.get(userId);
    if (isCacheValid(cached, USER_PROFILE_CACHE_TTL)) {
      const age = getCacheAge(cached);
      console.log(`👤 Using cached user profile (age: ${age}s)`);
      if (isMountedRef.current) {
        setProfile(cached.data);
        setLoading(false);
        setIsCached(true);
        setError(null);
        setNotFound(false);
      }
    } else {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      setIsCached(false);
      setNotFound(false);

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/profile/${userId}`);

        if (response.status === 404) {
          if (isMountedRef.current) {
            setNotFound(true);
            setProfile(null);
            setProductsLoading(false);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch user profile`);
        }

        const data = await response.json();
        const profileData = data.data || data;

        userProfileCache.set(userId, createCacheEntry(profileData));

        if (isMountedRef.current) {
          setProfile(profileData);
          setError(null);
          console.log(`✅ Loaded user profile (cached for next 10 min)`);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        if (isMountedRef.current) {
          setError(err.message);
          setProfile(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    // Fetch seller's products
    if (!isMountedRef.current) return;
    setProductsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/products?createdBy=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        if (isMountedRef.current) setProducts(list);
      }
    } catch (err) {
      console.error('Error fetching seller products:', err);
    } finally {
      if (isMountedRef.current) setProductsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [userId, fetchProfile]);

  const clearProfileCache = useCallback(() => {
    invalidateCache(userProfileCache, userId);
    console.log(`🔄 User profile cache invalidated`);
  }, [userId]);

  return { profile, loading, error, isCached, notFound, products, productsLoading, invalidateCache: clearProfileCache, refetch: fetchProfile };
}
