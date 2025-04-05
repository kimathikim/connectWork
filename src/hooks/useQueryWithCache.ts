import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { getCacheItem, setCacheItem, CACHE_EXPIRY } from '../lib/cache-utils';

/**
 * Custom hook that combines React Query with localStorage caching
 * This provides an additional layer of caching for offline support
 * 
 * @param queryKey The key to use for the query cache
 * @param queryFn The function to fetch the data
 * @param options Additional options for useQuery
 * @param cacheExpiry How long to cache the data in localStorage
 * @returns UseQueryResult with the data
 */
export function useQueryWithCache<TData, TError = unknown>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>,
  cacheExpiry = CACHE_EXPIRY.MEDIUM
): UseQueryResult<TData, TError> {
  // Create a cache key from the query key
  const cacheKey = `query_${queryKey.join('_')}`;
  
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        // Try to get from localStorage cache first for immediate display
        const cachedData = getCacheItem<TData>(cacheKey);
        
        // Fetch fresh data regardless of cache status
        const freshData = await queryFn();
        
        // Update the cache with fresh data
        setCacheItem(cacheKey, freshData, cacheExpiry);
        
        // Return the fresh data
        return freshData;
      } catch (error) {
        // If fetching fails, try to return cached data as fallback
        const cachedData = getCacheItem<TData>(cacheKey);
        if (cachedData) {
          console.log(`Fetch failed, using cached data for ${cacheKey}`);
          return cachedData;
        }
        throw error;
      }
    },
    ...options,
    // Use the cached data for initial data if available
    initialData: () => {
      const cachedData = getCacheItem<TData>(cacheKey);
      return cachedData || undefined;
    },
  });
}
