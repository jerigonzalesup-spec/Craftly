/**
 * Cache Utilities
 * Centralized cache helper functions to avoid duplication
 * Used by both client hooks and server controllers
 */

/**
 * Check if a cache entry is still valid based on TTL
 * @param {Object} cacheEntry - Cache entry with { data, timestamp }
 * @param {Number} ttl - Time to live in milliseconds
 * @returns {Boolean} true if cache is valid, false if expired or invalid
 */
export function isCacheValid(cacheEntry, ttl) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return false;
  }
  const age = Date.now() - cacheEntry.timestamp;
  return age < ttl;
}

/**
 * Get cache entry age in seconds
 * @param {Object} cacheEntry - Cache entry with timestamp
 * @returns {Number} Age in seconds
 */
export function getCacheAge(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return null;
  }
  return Math.round((Date.now() - cacheEntry.timestamp) / 1000);
}

/**
 * Create a cache entry with current timestamp
 * @param {*} data - Data to cache
 * @returns {Object} Cache entry with { data, timestamp }
 */
export function createCacheEntry(data) {
  return {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Invalidate cache entry by key
 * @param {Map} cacheMap - Cache Map object
 * @param {String} key - Cache key to invalidate
 * @returns {Boolean} true if entry existed and was deleted
 */
export function invalidateCache(cacheMap, key) {
  return cacheMap.delete(key);
}

/**
 * Clear all cache entries
 * @param {Map} cacheMap - Cache Map object
 */
export function clearCache(cacheMap) {
  cacheMap.clear();
}

/**
 * Get cache size (number of entries)
 * @param {Map} cacheMap - Cache Map object
 * @returns {Number} Number of cached entries
 */
export function getCacheSize(cacheMap) {
  return cacheMap.size;
}

/**
 * QUOTA OPTIMIZATION: Request deduplication
 * Prevents duplicate requests within a time window
 * Useful for preventing rapid successive API calls
 */
const pendingRequests = new Map(); // Map<key, Promise>

/**
 * Execute request with deduplication
 * If same request is already pending, return that promise instead
 * @param {String} key - Unique request key
 * @param {Function} requestFn - Async function to execute
 * @returns {Promise} Request result
 */
export async function debouncedRequest(key, requestFn) {
  // If request is already pending, return it
  if (pendingRequests.has(key)) {
    console.log(`⏸️ Request deduplicated: ${key}`);
    return pendingRequests.get(key);
  }

  // Create new promise
  const promise = requestFn()
    .finally(() => {
      // Remove from pending after completion
      pendingRequests.delete(key);
    });

  // Store promise
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * QUOTA OPTIMIZATION: Request rate limiting
 * Prevents requests from happening faster than a specified interval
 * Useful for paginated or filtered searches
 */
const lastRequestTimes = new Map(); // Map<key, timestamp>

/**
 * Check if request is allowed based on rate limit
 * @param {String} key - Unique request key
 * @param {Number} minInterval - Minimum time (ms) between requests
 * @returns {Boolean} true if request is allowed, false if rate limited
 */
export function isRateLimitAllowed(key, minInterval = 1000) {
  const lastTime = lastRequestTimes.get(key);
  const now = Date.now();

  if (!lastTime || (now - lastTime) >= minInterval) {
    lastRequestTimes.set(key, now);
    return true;
  }

  return false;
}

/**
 * Force update rate limit (call when request succeeds)
 * @param {String} key - Unique request key
 */
export function updateRateLimit(key) {
  lastRequestTimes.set(key, Date.now());
}

/**
 * QUOTA OPTIMIZATION: In-memory LRU (Least Recently Used) cache
 * Automatically evicts old entries when size exceeds limit
 */
export class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(`♻️ LRU Cache evicted oldest entry (size: ${this.maxSize})`);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  has(key) {
    return this.cache.has(key);
  }
}

/**
 * QUOTA OPTIMIZATION: Memory usage monitoring
 * Helps track and prevent memory leaks from excessive caching
 */
export function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
    };
  }
  return null;
}

/**
 * Estimate cache memory usage (rough estimate)
 * @param {Object} obj - Object to estimate size
 * @returns {Number} Estimated size in bytes
 */
export function estimateObjectSize(obj) {
  const objectList = [];
  const stack = [obj];
  let bytes = 0;

  while (stack.length) {
    const value = stack.pop();

    if (typeof value === 'boolean') {
      bytes += 4;
    } else if (typeof value === 'string') {
      bytes += value.length * 2;
    } else if (typeof value === 'number') {
      bytes += 8;
    } else if (typeof value === 'object' && value !== null) {
      if (objectList.indexOf(value) === -1) {
        objectList.push(value);

        if (Array.isArray(value)) {
          stack.push(...value);
        } else {
          Object.values(value).forEach(v => stack.push(v));
        }
      }
    }
  }
  return bytes;
}

