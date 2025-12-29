/**
 * Hook to track online/offline status with event dispatching.
 * Fires custom events when connectivity changes to enable sync triggers.
 */

import { useState, useEffect, useSyncExternalStore } from 'react';

// Singleton for tracking offline state across renders
let wasOfflineInternal = false;

/**
 * Subscribe to online/offline browser events.
 */
function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * Get current snapshot of online status.
 */
function getOnlineStatusSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Server snapshot always returns true (for SSR).
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to track browser online/offline status.
 *
 * @returns Object with isOnline boolean and wasOffline flag
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, wasOffline } = useOnlineStatus();
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />;
 *   }
 *
 *   if (wasOffline) {
 *     return <SyncingIndicator />;
 *   }
 *
 *   return <NormalContent />;
 * }
 * ```
 */
export function useOnlineStatus(): {
  isOnline: boolean;
  wasOffline: boolean;
} {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatusSnapshot,
    getServerSnapshot
  );

  const [wasOffline, setWasOffline] = useState(wasOfflineInternal);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineInternal = true;
      setWasOffline(true);

      // Dispatch custom event for offline listeners
      window.dispatchEvent(new CustomEvent('studyhub:offline'));
    } else if (wasOfflineInternal) {
      // Just came back online
      window.dispatchEvent(new CustomEvent('studyhub:online'));

      // Reset wasOffline after a delay to allow sync UI to show
      const timer = setTimeout(() => {
        wasOfflineInternal = false;
        setWasOffline(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return { isOnline, wasOffline };
}

/**
 * Hook to listen for connectivity change events.
 *
 * @param onOnline - Callback when coming back online
 * @param onOffline - Callback when going offline
 *
 * @example
 * ```tsx
 * useConnectivityEvents({
 *   onOnline: () => syncPendingOperations(),
 *   onOffline: () => showOfflineNotification(),
 * });
 * ```
 */
export function useConnectivityEvents(handlers: {
  onOnline?: () => void;
  onOffline?: () => void;
}): void {
  const { onOnline, onOffline } = handlers;

  useEffect(() => {
    const handleOnline = () => onOnline?.();
    const handleOffline = () => onOffline?.();

    window.addEventListener('studyhub:online', handleOnline);
    window.addEventListener('studyhub:offline', handleOffline);

    return () => {
      window.removeEventListener('studyhub:online', handleOnline);
      window.removeEventListener('studyhub:offline', handleOffline);
    };
  }, [onOnline, onOffline]);
}

/**
 * Check if the browser is currently online.
 * For use outside of React components.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
