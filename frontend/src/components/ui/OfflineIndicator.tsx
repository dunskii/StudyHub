/**
 * Offline indicator component.
 * Shows a banner when the app is offline or syncing after coming back online.
 */

import { memo } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Additional CSS classes */
  className?: string;
}

/**
 * OfflineIndicator shows connection status to users.
 *
 * - Shows nothing when online and never been offline
 * - Shows "Offline" banner when connection is lost
 * - Shows "Syncing" banner when connection restored
 *
 * @example
 * ```tsx
 * // In your app layout
 * <OfflineIndicator position="bottom" />
 * ```
 */
export const OfflineIndicator = memo(function OfflineIndicator({
  position = 'bottom',
  className,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't show if always been online
  if (isOnline && !wasOffline) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-4' : 'bottom-4';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-300',
        positionClasses,
        isOnline
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
        className
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
          <span>Back online - syncing data...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>You're offline - using cached data</span>
        </>
      )}
    </div>
  );
});

/**
 * Compact offline indicator for use in navigation bars.
 */
export const OfflineStatusBadge = memo(function OfflineStatusBadge({
  className,
}: {
  className?: string;
}) {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't show if always been online
  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
        isOnline
          ? 'bg-green-100 text-green-700'
          : 'bg-amber-100 text-amber-700',
        className
      )}
      title={isOnline ? 'Syncing...' : 'Offline'}
    >
      {isOnline ? (
        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <WifiOff className="h-3 w-3" aria-hidden="true" />
      )}
      <span className="sr-only">
        {isOnline ? 'Syncing data' : 'Offline mode'}
      </span>
    </div>
  );
});

/**
 * Full-page offline fallback for critical features.
 */
export const OfflineFallback = memo(function OfflineFallback({
  title = "You're offline",
  message = 'This feature requires an internet connection. Please check your connection and try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { isOnline } = useOnlineStatus();

  return (
    <div
      role="alert"
      className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center"
    >
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <WifiOff
          className="h-8 w-8 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        {message}
      </p>
      {onRetry && isOnline && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
});
