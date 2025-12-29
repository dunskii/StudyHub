/**
 * Tests for IndexedDB database module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isIndexedDBAvailable } from '../database';

// Mock indexedDB for testing
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

describe('database', () => {
  describe('isIndexedDBAvailable', () => {
    const originalIndexedDB = globalThis.indexedDB;

    afterEach(() => {
      // Restore original
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIndexedDB,
        writable: true,
        configurable: true,
      });
    });

    it('returns true when indexedDB is available', () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: mockIndexedDB,
        writable: true,
        configurable: true,
      });

      expect(isIndexedDBAvailable()).toBe(true);
    });

    it('returns false when indexedDB is undefined', () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isIndexedDBAvailable()).toBe(false);
    });

    it('returns false when indexedDB is null', () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: null,
        writable: true,
        configurable: true,
      });

      expect(isIndexedDBAvailable()).toBe(false);
    });
  });
});
