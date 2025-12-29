/**
 * Curriculum sync service for offline support.
 * Synchronizes curriculum data (frameworks, subjects, outcomes) to IndexedDB.
 */

import {
  getDB,
  CachedFramework,
  CachedSubject,
  CachedOutcome,
} from './database';
import { isOnline } from '@/hooks/useOnlineStatus';

// API base URL
const API_BASE = '/api/v1';

/**
 * Fetch JSON from API with error handling.
 */
async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sync all curriculum frameworks to IndexedDB.
 */
export async function syncFrameworks(): Promise<number> {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const db = await getDB();
  const frameworks = await fetchAPI<CachedFramework[]>('/frameworks');

  const tx = db.transaction('frameworks', 'readwrite');
  await Promise.all([
    ...frameworks.map((f) => tx.store.put(f)),
    tx.done,
  ]);

  // Update metadata
  const metaTx = db.transaction('metadata', 'readwrite');
  await metaTx.store.put({
    key: 'frameworks_sync',
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await metaTx.done;

  return frameworks.length;
}

/**
 * Sync subjects for a specific framework to IndexedDB.
 */
export async function syncSubjects(frameworkId: string): Promise<number> {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const db = await getDB();
  const subjects = await fetchAPI<CachedSubject[]>(
    `/subjects?framework_id=${frameworkId}`
  );

  const tx = db.transaction('subjects', 'readwrite');

  // Clear old subjects for this framework first
  const existingSubjects = await db.getAllFromIndex(
    'subjects',
    'by-framework',
    frameworkId
  );
  await Promise.all([
    ...existingSubjects.map((s) => tx.store.delete(s.id)),
    ...subjects.map((s) => tx.store.put(s)),
    tx.done,
  ]);

  // Update metadata
  const metaTx = db.transaction('metadata', 'readwrite');
  await metaTx.store.put({
    key: `subjects_sync_${frameworkId}`,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await metaTx.done;

  return subjects.length;
}

/**
 * Sync curriculum outcomes for a framework (paginated).
 */
export async function syncOutcomes(frameworkId: string): Promise<number> {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const db = await getDB();
  let totalSynced = 0;
  let page = 1;
  let hasMore = true;
  const pageSize = 100;

  // Start transaction to clear old outcomes
  const clearTx = db.transaction('outcomes', 'readwrite');
  const existingOutcomes = await db.getAllFromIndex(
    'outcomes',
    'by-framework',
    frameworkId
  );
  await Promise.all([
    ...existingOutcomes.map((o) => clearTx.store.delete(o.id)),
    clearTx.done,
  ]);

  // Fetch and store outcomes in pages
  while (hasMore) {
    const outcomes = await fetchAPI<CachedOutcome[]>(
      `/curriculum/outcomes?framework_id=${frameworkId}&page=${page}&limit=${pageSize}`
    );

    if (outcomes.length > 0) {
      const tx = db.transaction('outcomes', 'readwrite');
      await Promise.all([
        ...outcomes.map((o) => tx.store.put(o)),
        tx.done,
      ]);
      totalSynced += outcomes.length;
    }

    hasMore = outcomes.length === pageSize;
    page++;
  }

  // Update metadata
  const metaTx = db.transaction('metadata', 'readwrite');
  await metaTx.store.put({
    key: `outcomes_sync_${frameworkId}`,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await metaTx.done;

  return totalSynced;
}

/**
 * Sync all curriculum data for a framework.
 */
export async function syncCurriculum(frameworkId: string): Promise<{
  frameworks: number;
  subjects: number;
  outcomes: number;
}> {
  const [frameworks, subjects, outcomes] = await Promise.all([
    syncFrameworks(),
    syncSubjects(frameworkId),
    syncOutcomes(frameworkId),
  ]);

  return { frameworks, subjects, outcomes };
}

// Offline data access functions

/**
 * Get all cached frameworks.
 */
export async function getOfflineFrameworks(): Promise<CachedFramework[]> {
  const db = await getDB();
  return db.getAll('frameworks');
}

/**
 * Get a cached framework by ID.
 */
export async function getOfflineFramework(
  id: string
): Promise<CachedFramework | undefined> {
  const db = await getDB();
  return db.get('frameworks', id);
}

/**
 * Get cached subjects for a framework.
 */
export async function getOfflineSubjects(
  frameworkId: string
): Promise<CachedSubject[]> {
  const db = await getDB();
  return db.getAllFromIndex('subjects', 'by-framework', frameworkId);
}

/**
 * Get a cached subject by ID.
 */
export async function getOfflineSubject(
  id: string
): Promise<CachedSubject | undefined> {
  const db = await getDB();
  return db.get('subjects', id);
}

/**
 * Get cached outcomes for a subject.
 */
export async function getOfflineOutcomes(
  subjectId: string
): Promise<CachedOutcome[]> {
  const db = await getDB();
  return db.getAllFromIndex('outcomes', 'by-subject', subjectId);
}

/**
 * Get cached outcomes for a stage.
 */
export async function getOfflineOutcomesByStage(
  stage: string
): Promise<CachedOutcome[]> {
  const db = await getDB();
  return db.getAllFromIndex('outcomes', 'by-stage', stage);
}

/**
 * Get a cached outcome by code.
 */
export async function getOfflineOutcomeByCode(
  code: string
): Promise<CachedOutcome | undefined> {
  const db = await getDB();
  const outcomes = await db.getAllFromIndex('outcomes', 'by-code', code);
  return outcomes[0];
}

/**
 * Get last sync time for curriculum data.
 */
export async function getLastSyncTime(
  frameworkId: string
): Promise<Date | null> {
  const db = await getDB();
  const meta = await db.get('metadata', `outcomes_sync_${frameworkId}`);

  if (meta?.value && typeof meta.value === 'string') {
    return new Date(meta.value);
  }

  return null;
}

/**
 * Check if curriculum data needs to be synced.
 * Returns true if data is stale (older than maxAge) or missing.
 */
export async function needsSync(
  frameworkId: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<boolean> {
  const lastSync = await getLastSyncTime(frameworkId);

  if (!lastSync) {
    return true;
  }

  const age = Date.now() - lastSync.getTime();
  return age > maxAgeMs;
}
