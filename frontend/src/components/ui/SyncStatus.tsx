/**
 * Sync status component.
 * Shows the number of pending operations and sync status.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { CloudOff, Loader2, Check, AlertTriangle } from 'lucide-react';
import { getPendingCount, processSyncQueue } from '@/lib/offline/syncQueue';
import { useOnlineStatus, useConnectivityEvents } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

type SyncState = 'synced' | 'pending' | 'syncing' | 'error';

interface SyncStatusProps {
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SyncStatus shows the current synchronization state.
 *
 * States:
 * - synced: All changes saved to server (green cloud)
 * - pending: Changes waiting to sync (amber cloud with count)
 * - syncing: Currently syncing (spinning loader)
 * - error: Sync failed (red warning)
 *
 * @example
 * ```tsx
 * // In navigation bar
 * <SyncStatus showLabel />
 * ```
 */
export const SyncStatus = memo(function SyncStatus({
  showLabel = false,
  className,
}: SyncStatusProps) {
  useOnlineStatus(); // Track online status for reactivity
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastError, setLastError] = useState<string | null>(null);

  // Update pending count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);

      if (count === 0) {
        setSyncState('synced');
      } else if (syncState !== 'syncing') {
        setSyncState('pending');
      }
    };

    updateCount();

    // Listen for queue updates
    const handleQueueUpdate = () => updateCount();
    window.addEventListener('studyhub:queue-updated', handleQueueUpdate);

    // Poll every 5 seconds as backup
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener('studyhub:queue-updated', handleQueueUpdate);
      clearInterval(interval);
    };
  }, [syncState]);

  // Auto-sync when coming back online
  const handleOnline = useCallback(async () => {
    if (pendingCount === 0) return;

    setSyncState('syncing');
    setLastError(null);

    try {
      const result = await processSyncQueue();

      if (result.failed > 0) {
        setSyncState('error');
        setLastError(`${result.failed} operations failed to sync`);
      } else if (result.remaining > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    } catch (error) {
      setSyncState('error');
      setLastError('Sync failed unexpectedly');
      console.error('Sync error:', error);
    }
  }, [pendingCount]);

  useConnectivityEvents({ onOnline: handleOnline });

  // Render based on state
  const renderContent = () => {
    switch (syncState) {
      case 'synced':
        return (
          <>
            <Check
              className="h-4 w-4 text-green-600"
              aria-hidden="true"
            />
            {showLabel && (
              <span className="text-green-600">Synced</span>
            )}
          </>
        );

      case 'pending':
        return (
          <>
            <div className="relative">
              <CloudOff
                className="h-4 w-4 text-amber-600"
                aria-hidden="true"
              />
              {pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            {showLabel && (
              <span className="text-amber-600">
                {pendingCount} pending
              </span>
            )}
          </>
        );

      case 'syncing':
        return (
          <>
            <Loader2
              className="h-4 w-4 animate-spin text-blue-600"
              aria-hidden="true"
            />
            {showLabel && (
              <span className="text-blue-600">Syncing...</span>
            )}
          </>
        );

      case 'error':
        return (
          <>
            <AlertTriangle
              className="h-4 w-4 text-red-600"
              aria-hidden="true"
            />
            {showLabel && (
              <span className="text-red-600">Sync error</span>
            )}
          </>
        );
    }
  };

  const getTitle = () => {
    switch (syncState) {
      case 'synced':
        return 'All changes saved';
      case 'pending':
        return `${pendingCount} changes waiting to sync`;
      case 'syncing':
        return 'Syncing changes...';
      case 'error':
        return lastError || 'Sync error';
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      title={getTitle()}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium',
        className
      )}
    >
      {renderContent()}
      <span className="sr-only">{getTitle()}</span>
    </div>
  );
});

/**
 * Compact sync indicator for tight spaces.
 */
export const SyncIndicator = memo(function SyncIndicator({
  className,
}: {
  className?: string;
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing] = useState(false);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();

    const handleQueueUpdate = () => updateCount();
    window.addEventListener('studyhub:queue-updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('studyhub:queue-updated', handleQueueUpdate);
    };
  }, []);

  // Don't show if nothing pending
  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-full',
        isSyncing ? 'bg-blue-100' : 'bg-amber-100',
        className
      )}
      title={isSyncing ? 'Syncing...' : `${pendingCount} pending`}
    >
      {isSyncing ? (
        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
      ) : (
        <span className="text-[10px] font-bold text-amber-700">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </div>
  );
});
