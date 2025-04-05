import { useState, useEffect } from 'react';
import { getCacheItem, setCacheItem, CACHE_EXPIRY } from '../lib/cache-utils';

/**
 * Custom hook for fetching data with caching
 * @param {string} cacheKey - The key to use for caching
 * @param {Function} fetchFn - The function to fetch data
 * @param {Object} options - Additional options
 * @param {number} options.expiry - Cache expiration time in milliseconds
 * @param {boolean} options.skipCache - Whether to skip the cache and always fetch fresh data
 * @param {Array} options.dependencies - Dependencies array for useEffect
 * @returns {Object} { data, loading, error, refetch }
 */
export function useCachedData(
  cacheKey,
  fetchFn,
  {
    expiry = CACHE_EXPIRY.MEDIUM,
    skipCache = false,
    dependencies = []
  } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data
  const fetchData = async (skipCacheForThisCall = skipCache) => {
    setLoading(true);
    setError(null);

    try {
      // Try to get from cache first if not skipping cache
      if (!skipCacheForThisCall) {
        const cachedData = getCacheItem(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          
          // Return early, but still fetch in the background to update cache
          setTimeout(() => {
            fetchFreshData().catch(console.error);
          }, 0);
          
          return;
        }
      }

      // Fetch fresh data
      await fetchFreshData();
    } catch (err) {
      console.error(`Error fetching data for ${cacheKey}:`, err);
      setError(err);
      
      // Try to get from cache as fallback
      const cachedData = getCacheItem(cacheKey);
      if (cachedData) {
        setData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch fresh data
  const fetchFreshData = async () => {
    const freshData = await fetchFn();
    setData(freshData);
    setCacheItem(cacheKey, freshData, expiry);
    return freshData;
  };

  // Refetch function that can be called manually
  const refetch = () => fetchData(true);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch };
}
