/**
 * Offline support module exports.
 */

// Database
export {
  getDB,
  closeDB,
  clearAllData,
  getCacheSize,
  isIndexedDBAvailable,
  type CachedFramework,
  type CachedSubject,
  type CachedOutcome,
  type CachedFlashcard,
  type PendingOperation,
  type CacheMetadata,
} from './database';

// Curriculum sync
export {
  syncFrameworks,
  syncSubjects,
  syncOutcomes,
  syncCurriculum,
  getOfflineFrameworks,
  getOfflineFramework,
  getOfflineSubjects,
  getOfflineSubject,
  getOfflineOutcomes,
  getOfflineOutcomesByStage,
  getOfflineOutcomeByCode,
  getLastSyncTime,
  needsSync,
} from './curriculumSync';

// Sync queue
export {
  queueOperation,
  processSyncQueue,
  getPendingCount,
  getPendingOperations,
  getPendingByType,
  removePendingOperation,
  clearSyncQueue,
  withOfflineSupport,
} from './syncQueue';
