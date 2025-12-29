/**
 * Sync queue for offline operations.
 * Queues operations when offline and processes them when back online.
 */

import { getDB, PendingOperation } from './database';
import { isOnline } from '@/hooks/useOnlineStatus';

// API base URL
const API_BASE = '/api/v1';

// Maximum retry attempts before giving up
const MAX_RETRIES = 5;

/**
 * Generate a unique ID for pending operations.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Queue an operation to be executed when online.
 *
 * @param type - Type of operation for categorization
 * @param endpoint - API endpoint (without base URL)
 * @param method - HTTP method
 * @param payload - Request body data
 * @returns The ID of the queued operation
 *
 * @example
 * ```ts
 * // Queue a flashcard answer
 * await queueOperation(
 *   'flashcard_answer',
 *   '/flashcards/123/answer',
 *   'POST',
 *   { answer: 'correct', ease: 4 }
 * );
 * ```
 */
export async function queueOperation(
  type: PendingOperation['type'],
  endpoint: string,
  method: PendingOperation['method'],
  payload: unknown
): Promise<string> {
  const db = await getDB();
  const id = generateId();

  await db.add('pendingSync', {
    id,
    type,
    endpoint,
    method,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
  });

  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('studyhub:queue-updated'));

  return id;
}

/**
 * Execute a single pending operation.
 * Returns true if successful, false if failed.
 */
async function executeOperation(op: PendingOperation): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}${op.endpoint}`, {
      method: op.method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: op.payload ? JSON.stringify(op.payload) : undefined,
    });

    // Consider 2xx and 4xx as "complete" (4xx means validation error, no point retrying)
    return response.ok || (response.status >= 400 && response.status < 500);
  } catch (error) {
    // Network error - will retry
    console.error(`Sync operation failed: ${op.id}`, error);
    return false;
  }
}

/**
 * Process all pending operations in the sync queue.
 * Should be called when coming back online.
 *
 * @returns Summary of sync results
 *
 * @example
 * ```ts
 * window.addEventListener('studyhub:online', async () => {
 *   const result = await processSyncQueue();
 *   console.log(`Synced: ${result.success}, Failed: ${result.failed}`);
 * });
 * ```
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> {
  if (!isOnline()) {
    return { success: 0, failed: 0, remaining: await getPendingCount() };
  }

  const db = await getDB();
  const pending = await db.getAll('pendingSync');

  let success = 0;
  let failed = 0;

  // Sort by created_at to process in order
  pending.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const op of pending) {
    const executed = await executeOperation(op);

    if (executed) {
      // Success - remove from queue
      await db.delete('pendingSync', op.id);
      success++;
    } else {
      // Failed - increment retry count
      const updated: PendingOperation = {
        ...op,
        retry_count: op.retry_count + 1,
      };

      if (updated.retry_count >= MAX_RETRIES) {
        // Max retries reached - remove and count as failed
        await db.delete('pendingSync', op.id);
        failed++;
        console.error(`Operation ${op.id} failed after ${MAX_RETRIES} retries`);
      } else {
        // Save updated retry count
        await db.put('pendingSync', updated);
      }
    }
  }

  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('studyhub:queue-updated'));

  return {
    success,
    failed,
    remaining: await getPendingCount(),
  };
}

/**
 * Get the number of pending operations in the queue.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingSync');
}

/**
 * Get all pending operations.
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getDB();
  return db.getAll('pendingSync');
}

/**
 * Get pending operations by type.
 */
export async function getPendingByType(
  type: PendingOperation['type']
): Promise<PendingOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingSync', 'by-type', type);
}

/**
 * Remove a specific pending operation.
 */
export async function removePendingOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingSync', id);
  window.dispatchEvent(new CustomEvent('studyhub:queue-updated'));
}

/**
 * Clear all pending operations.
 * Use with caution - this discards all queued changes.
 */
export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('pendingSync');
  window.dispatchEvent(new CustomEvent('studyhub:queue-updated'));
}

/**
 * Helper to wrap an API call with offline queueing.
 * If online, executes immediately. If offline, queues for later.
 *
 * @example
 * ```ts
 * const result = await withOfflineSupport(
 *   'flashcard_answer',
 *   '/flashcards/123/answer',
 *   'POST',
 *   { answer: 'correct' },
 *   async () => {
 *     // Online execution
 *     return await api.post('/flashcards/123/answer', { answer: 'correct' });
 *   }
 * );
 *
 * if (result.queued) {
 *   console.log('Saved offline, will sync later');
 * } else {
 *   console.log('Synced immediately:', result.data);
 * }
 * ```
 */
export async function withOfflineSupport<T>(
  type: PendingOperation['type'],
  endpoint: string,
  method: PendingOperation['method'],
  payload: unknown,
  onlineExecutor: () => Promise<T>
): Promise<{ queued: boolean; data?: T; operationId?: string }> {
  if (isOnline()) {
    try {
      const data = await onlineExecutor();
      return { queued: false, data };
    } catch (error) {
      // If online but request failed, queue it
      const operationId = await queueOperation(type, endpoint, method, payload);
      return { queued: true, operationId };
    }
  }

  // Offline - queue the operation
  const operationId = await queueOperation(type, endpoint, method, payload);
  return { queued: true, operationId };
}
