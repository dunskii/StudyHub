/**
 * IndexedDB database module for offline support.
 * Provides typed access to cached curriculum data, flashcards, and sync queue.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema types
export interface CachedFramework {
  id: string;
  code: string;
  name: string;
  country: string;
  is_active: boolean;
  updated_at: string;
}

export interface CachedSubject {
  id: string;
  framework_id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  available_stages: string[];
  updated_at: string;
}

export interface CachedOutcome {
  id: string;
  framework_id: string;
  subject_id: string;
  code: string;
  description: string;
  stage: string;
  strand: string;
  updated_at: string;
}

export interface CachedFlashcard {
  id: string;
  student_id: string;
  subject_id: string;
  front: string;
  back: string;
  due_date: string;
  ease_factor: number;
  interval: number;
  updated_at: string;
}

export interface PendingOperation {
  id: string;
  type: 'flashcard_answer' | 'session_create' | 'goal_update' | 'session_complete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: unknown;
  created_at: string;
  retry_count: number;
}

export interface CacheMetadata {
  key: string;
  value: unknown;
  updated_at: string;
}

// IndexedDB schema definition
interface StudyHubDB extends DBSchema {
  frameworks: {
    key: string;
    value: CachedFramework;
    indexes: {
      'by-code': string;
      'by-active': number; // IDB doesn't support boolean indexes directly
    };
  };
  subjects: {
    key: string;
    value: CachedSubject;
    indexes: {
      'by-framework': string;
      'by-code': string;
    };
  };
  outcomes: {
    key: string;
    value: CachedOutcome;
    indexes: {
      'by-framework': string;
      'by-subject': string;
      'by-stage': string;
      'by-code': string;
    };
  };
  flashcards: {
    key: string;
    value: CachedFlashcard;
    indexes: {
      'by-student': string;
      'by-subject': string;
      'by-due': string;
    };
  };
  pendingSync: {
    key: string;
    value: PendingOperation;
    indexes: {
      'by-type': string;
      'by-created': string;
    };
  };
  metadata: {
    key: string;
    value: CacheMetadata;
  };
}

const DB_NAME = 'StudyHub';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<StudyHubDB> | null = null;

/**
 * Get or create the IndexedDB database instance.
 * Uses singleton pattern for connection reuse.
 */
export async function getDB(): Promise<IDBPDatabase<StudyHubDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<StudyHubDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1: Initial schema
      if (oldVersion < 1) {
        // Frameworks store
        const frameworkStore = db.createObjectStore('frameworks', { keyPath: 'id' });
        frameworkStore.createIndex('by-code', 'code');
        frameworkStore.createIndex('by-active', 'is_active');

        // Subjects store
        const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
        subjectStore.createIndex('by-framework', 'framework_id');
        subjectStore.createIndex('by-code', 'code');

        // Outcomes store
        const outcomeStore = db.createObjectStore('outcomes', { keyPath: 'id' });
        outcomeStore.createIndex('by-framework', 'framework_id');
        outcomeStore.createIndex('by-subject', 'subject_id');
        outcomeStore.createIndex('by-stage', 'stage');
        outcomeStore.createIndex('by-code', 'code');

        // Flashcards store
        const flashcardStore = db.createObjectStore('flashcards', { keyPath: 'id' });
        flashcardStore.createIndex('by-student', 'student_id');
        flashcardStore.createIndex('by-subject', 'subject_id');
        flashcardStore.createIndex('by-due', 'due_date');

        // Pending sync store
        const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id' });
        syncStore.createIndex('by-type', 'type');
        syncStore.createIndex('by-created', 'created_at');

        // Metadata store
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      // Future migrations would go here:
      // if (oldVersion < 2) { ... }
    },
    blocked() {
      console.warn('IndexedDB blocked - close other tabs using StudyHub');
    },
    blocking() {
      // Close this connection to allow upgrade to proceed
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Close the database connection.
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all data from the database.
 * Use with caution - this removes all cached data.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();

  await Promise.all([
    db.clear('frameworks'),
    db.clear('subjects'),
    db.clear('outcomes'),
    db.clear('flashcards'),
    db.clear('pendingSync'),
    db.clear('metadata'),
  ]);
}

/**
 * Get the total size of cached data (approximate).
 */
export async function getCacheSize(): Promise<{
  frameworks: number;
  subjects: number;
  outcomes: number;
  flashcards: number;
  pendingSync: number;
}> {
  const db = await getDB();

  const [frameworks, subjects, outcomes, flashcards, pendingSync] = await Promise.all([
    db.count('frameworks'),
    db.count('subjects'),
    db.count('outcomes'),
    db.count('flashcards'),
    db.count('pendingSync'),
  ]);

  return { frameworks, subjects, outcomes, flashcards, pendingSync };
}

/**
 * Check if IndexedDB is available in the current browser.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
