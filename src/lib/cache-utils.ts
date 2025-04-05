/**
 * Cache utility functions for improving application performance
 */

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRY = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 1 week
};

// Cache keys
export const CACHE_KEYS = {
  SERVICES: 'services',
  WORKER_PROFILES: 'worker_profiles',
  JOBS: 'jobs',
  USER_PROFILE: 'user_profile',
  SEARCH_RESULTS: 'search_results',
};

/**
 * Cache item structure
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Set an item in the cache
 * @param key Cache key
 * @param data Data to cache
 * @param expiry Expiration time in milliseconds
 */
export function setCacheItem<T>(key: string, data: T, expiry = CACHE_EXPIRY.MEDIUM): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error setting cache item:', error);
    // If localStorage is full, clear old items
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCacheItems();
      // Try again
      try {
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          expiry,
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));
      } catch (retryError) {
        console.error('Error setting cache item after clearing old items:', retryError);
      }
    }
  }
}

/**
 * Get an item from the cache
 * @param key Cache key
 * @returns Cached data or null if not found or expired
 */
export function getCacheItem<T>(key: string): T | null {
  try {
    const cacheItemJson = localStorage.getItem(key);
    if (!cacheItemJson) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cacheItemJson);
    const now = Date.now();

    // Check if the cache item has expired
    if (now - cacheItem.timestamp > cacheItem.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error('Error getting cache item:', error);
    return null;
  }
}

/**
 * Remove an item from the cache
 * @param key Cache key
 */
export function removeCacheItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing cache item:', error);
  }
}

/**
 * Clear all cache items
 */
export function clearCache(): void {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear old cache items (older than 1 week)
 */
export function clearOldCacheItems(): void {
  try {
    const now = Date.now();
    const oneWeek = CACHE_EXPIRY.WEEK;

    // Get all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const cacheItemJson = localStorage.getItem(key);
          if (cacheItemJson) {
            const cacheItem = JSON.parse(cacheItemJson);
            if (cacheItem.timestamp && now - cacheItem.timestamp > oneWeek) {
              localStorage.removeItem(key);
            }
          }
        } catch (parseError) {
          // Skip items that aren't valid cache items
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error clearing old cache items:', error);
  }
}

/**
 * Generate a cache key for search results
 * @param searchParams Search parameters
 * @returns Cache key
 */
export function generateSearchCacheKey(searchParams: Record<string, any>): string {
  const sortedParams = Object.keys(searchParams)
    .sort()
    .reduce((acc, key) => {
      if (searchParams[key] !== undefined && searchParams[key] !== null) {
        acc[key] = searchParams[key];
      }
      return acc;
    }, {} as Record<string, any>);

  return `${CACHE_KEYS.SEARCH_RESULTS}_${JSON.stringify(sortedParams)}`;
}

/**
 * Cache wrapper for async functions
 * @param cacheKey Cache key
 * @param fetchFn Function to fetch data
 * @param expiry Cache expiration time
 * @returns Cached data or freshly fetched data
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  expiry = CACHE_EXPIRY.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cachedData = getCacheItem<T>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // If not in cache or expired, fetch fresh data
  const freshData = await fetchFn();

  // Cache the fresh data
  setCacheItem(cacheKey, freshData, expiry);

  return freshData;
}