/**
 * Hooks for accessing offline-first data.
 * Provides React Query-like interface with IndexedDB fallback.
 */

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useOnlineStatus, useConnectivityEvents } from './useOnlineStatus';
import {
  getOfflineSubjects,
  getOfflineOutcomes,
  getOfflineFrameworks,
  syncCurriculum,
  needsSync,
  CachedSubject,
  CachedOutcome,
  CachedFramework,
} from '@/lib/offline';

/**
 * Hook for fetching subjects with offline fallback.
 * Fetches from API when online, falls back to IndexedDB when offline.
 */
export function useOfflineSubjects(
  frameworkId: string,
  options?: Omit<UseQueryOptions<CachedSubject[]>, 'queryKey' | 'queryFn'>
) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  // Sync when coming back online
  useConnectivityEvents({
    onOnline: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', frameworkId] });
    },
  });

  return useQuery({
    queryKey: ['subjects', frameworkId, 'offline'],
    queryFn: async () => {
      if (isOnline) {
        try {
          // Fetch from API
          const response = await fetch(`/api/v1/subjects?framework_id=${frameworkId}`);
          if (response.ok) {
            return response.json();
          }
        } catch {
          // Fall through to offline data
        }
      }

      // Use cached data
      return getOfflineSubjects(frameworkId);
    },
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 min online, never stale offline
    ...options,
  });
}

/**
 * Hook for fetching curriculum outcomes with offline fallback.
 */
export function useOfflineOutcomes(
  subjectId: string,
  options?: Omit<UseQueryOptions<CachedOutcome[]>, 'queryKey' | 'queryFn'>
) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  useConnectivityEvents({
    onOnline: async () => {
      await queryClient.invalidateQueries({ queryKey: ['outcomes', subjectId] });
    },
  });

  return useQuery({
    queryKey: ['outcomes', subjectId, 'offline'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const response = await fetch(`/api/v1/curriculum/outcomes?subject_id=${subjectId}`);
          if (response.ok) {
            return response.json();
          }
        } catch {
          // Fall through to offline data
        }
      }

      return getOfflineOutcomes(subjectId);
    },
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    ...options,
  });
}

/**
 * Hook for fetching frameworks with offline fallback.
 */
export function useOfflineFrameworks(
  options?: Omit<UseQueryOptions<CachedFramework[]>, 'queryKey' | 'queryFn'>
) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  useConnectivityEvents({
    onOnline: async () => {
      await queryClient.invalidateQueries({ queryKey: ['frameworks'] });
    },
  });

  return useQuery({
    queryKey: ['frameworks', 'offline'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const response = await fetch('/api/v1/frameworks');
          if (response.ok) {
            return response.json();
          }
        } catch {
          // Fall through to offline data
        }
      }

      return getOfflineFrameworks();
    },
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity, // 30 min online
    ...options,
  });
}

/**
 * Hook to trigger curriculum sync on app load.
 * Should be used once in the app root.
 */
export function useCurriculumSync(frameworkId: string | null) {
  const { isOnline } = useOnlineStatus();

  const syncIfNeeded = useCallback(async () => {
    if (!frameworkId || !isOnline) return;

    try {
      const stale = await needsSync(frameworkId, 24 * 60 * 60 * 1000); // 24 hours
      if (stale) {
        console.log('Curriculum data is stale, syncing...');
        await syncCurriculum(frameworkId);
        console.log('Curriculum sync complete');
      }
    } catch (error) {
      console.error('Curriculum sync failed:', error);
    }
  }, [frameworkId, isOnline]);

  // Sync on mount and when coming online
  useEffect(() => {
    syncIfNeeded();
  }, [syncIfNeeded]);

  useConnectivityEvents({
    onOnline: syncIfNeeded,
  });

  return { syncNow: syncIfNeeded };
}

/**
 * Hook to check if data is available offline.
 */
export function useOfflineAvailability(frameworkId: string) {
  return useQuery({
    queryKey: ['offline-availability', frameworkId],
    queryFn: async () => {
      const subjects = await getOfflineSubjects(frameworkId);
      return {
        hasSubjects: subjects.length > 0,
        subjectCount: subjects.length,
      };
    },
    staleTime: Infinity, // Cache indefinitely
  });
}
