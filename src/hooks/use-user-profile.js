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
      }
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    setIsCached(false);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/profile/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch user profile`);
      }

      const data = await response.json();
      const profileData = data.data || data;

      // Cache the results
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
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [userId, fetchProfile]);

  const clearProfileCache = useCallback(() => {
    invalidateCache(userProfileCache, userId);
    console.log(`🔄 User profile cache invalidated`);
  }, [userId]);

  return { profile, loading, error, isCached, invalidateCache: clearProfileCache, refetch: fetchProfile };
}
