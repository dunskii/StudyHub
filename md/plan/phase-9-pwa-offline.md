# Implementation Plan: Phase 9 - PWA & Offline Support

## Overview

Transform StudyHub into a full Progressive Web App (PWA) with offline support, enabling students to continue studying without internet connectivity. This phase includes service worker configuration, IndexedDB for offline data storage, background synchronization, and push notifications for study reminders.

**Complexity**: Medium-High
**Estimated Duration**: 2 weeks
**Dependencies**: Phases 1-8 complete

---

## Prerequisites

- [x] Vite PWA Plugin installed (v0.19.2)
- [x] Workbox available (via vite-plugin-pwa)
- [x] Basic manifest config in vite.config.ts
- [x] Notification system from Phase 7
- [ ] Install `idb` library for IndexedDB
- [ ] Generate PWA icon assets
- [ ] Add HTML meta tags for PWA

---

## Phase 1: PWA Foundation (Days 1-2)

### 1.1 Icon Asset Generation

Create icons in `frontend/public/`:

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 32x32 | Browser tab favicon |
| `favicon.svg` | Scalable | Modern browsers |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `pwa-192x192.png` | 192x192 | Android standard |
| `pwa-512x512.png` | 512x512 | Android splash |
| `pwa-maskable-192x192.png` | 192x192 | Android adaptive icon |
| `pwa-maskable-512x512.png` | 512x512 | Android adaptive icon |
| `mask-icon.svg` | Scalable | Safari pinned tab |

**Design**: Blue gradient background (#3b82f6 → #1d4ed8) with white graduation cap or book icon.

### 1.2 HTML Meta Tags

Update `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="StudyHub - AI-powered study assistant with curriculum integration" />

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#3b82f6" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="StudyHub" />

    <!-- Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="mask-icon" href="/mask-icon.svg" color="#3b82f6" />

    <title>StudyHub</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 1.3 Manifest Configuration

Update `frontend/vite.config.ts`:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: [
    'favicon.ico',
    'favicon.svg',
    'apple-touch-icon.png',
    'mask-icon.svg'
  ],
  manifest: {
    name: 'StudyHub',
    short_name: 'StudyHub',
    description: 'AI-powered study assistant for Australian students',
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'pwa-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    screenshots: [
      {
        src: 'screenshot-narrow.png',
        sizes: '540x720',
        type: 'image/png',
        form_factor: 'narrow'
      },
      {
        src: 'screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true
  }
})
```

### 1.4 Deliverables
- [ ] All icon files in `frontend/public/`
- [ ] Updated `index.html` with PWA meta tags
- [ ] Enhanced `vite.config.ts` manifest
- [ ] PWA installable on Chrome/Safari/Edge

---

## Phase 2: IndexedDB Infrastructure (Days 3-4)

### 2.1 Install Dependencies

```bash
cd frontend && npm install idb
```

### 2.2 Database Schema

Create `frontend/src/lib/offline/database.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StudyHubDB extends DBSchema {
  frameworks: {
    key: string;
    value: {
      id: string;
      code: string;
      name: string;
      country: string;
      is_active: boolean;
      updated_at: string;
    };
    indexes: { 'by-code': string; 'by-active': boolean };
  };
  subjects: {
    key: string;
    value: {
      id: string;
      framework_id: string;
      code: string;
      name: string;
      icon: string;
      color: string;
      available_stages: string[];
      updated_at: string;
    };
    indexes: { 'by-framework': string; 'by-code': string };
  };
  outcomes: {
    key: string;
    value: {
      id: string;
      framework_id: string;
      subject_id: string;
      code: string;
      description: string;
      stage: string;
      strand: string;
      updated_at: string;
    };
    indexes: {
      'by-framework': string;
      'by-subject': string;
      'by-stage': string;
      'by-code': string;
    };
  };
  flashcards: {
    key: string;
    value: {
      id: string;
      student_id: string;
      subject_id: string;
      front: string;
      back: string;
      due_date: string;
      ease_factor: number;
      interval: number;
      updated_at: string;
    };
    indexes: {
      'by-student': string;
      'by-subject': string;
      'by-due': string;
    };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: 'flashcard_answer' | 'session_create' | 'goal_update';
      endpoint: string;
      method: 'POST' | 'PUT' | 'PATCH';
      payload: unknown;
      created_at: string;
      retry_count: number;
    };
    indexes: { 'by-type': string; 'by-created': string };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updated_at: string;
    };
  };
}

const DB_NAME = 'StudyHub';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase<StudyHubDB>> {
  return openDB<StudyHubDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Frameworks store
      if (!db.objectStoreNames.contains('frameworks')) {
        const frameworkStore = db.createObjectStore('frameworks', { keyPath: 'id' });
        frameworkStore.createIndex('by-code', 'code');
        frameworkStore.createIndex('by-active', 'is_active');
      }

      // Subjects store
      if (!db.objectStoreNames.contains('subjects')) {
        const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
        subjectStore.createIndex('by-framework', 'framework_id');
        subjectStore.createIndex('by-code', 'code');
      }

      // Outcomes store
      if (!db.objectStoreNames.contains('outcomes')) {
        const outcomeStore = db.createObjectStore('outcomes', { keyPath: 'id' });
        outcomeStore.createIndex('by-framework', 'framework_id');
        outcomeStore.createIndex('by-subject', 'subject_id');
        outcomeStore.createIndex('by-stage', 'stage');
        outcomeStore.createIndex('by-code', 'code');
      }

      // Flashcards store
      if (!db.objectStoreNames.contains('flashcards')) {
        const flashcardStore = db.createObjectStore('flashcards', { keyPath: 'id' });
        flashcardStore.createIndex('by-student', 'student_id');
        flashcardStore.createIndex('by-subject', 'subject_id');
        flashcardStore.createIndex('by-due', 'due_date');
      }

      // Pending sync store
      if (!db.objectStoreNames.contains('pendingSync')) {
        const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id' });
        syncStore.createIndex('by-type', 'type');
        syncStore.createIndex('by-created', 'created_at');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    }
  });
}
```

### 2.3 Online Status Hook

Create `frontend/src/hooks/useOnlineStatus.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      // Trigger sync when coming back online
      window.dispatchEvent(new CustomEvent('studyhub:online'));
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    window.dispatchEvent(new CustomEvent('studyhub:offline'));
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
```

### 2.4 Deliverables
- [ ] `idb` library installed
- [ ] `lib/offline/database.ts` with schema
- [ ] `hooks/useOnlineStatus.ts`
- [ ] TypeScript types for all stores

---

## Phase 3: Offline Curriculum Caching (Days 5-7)

### 3.1 Curriculum Sync Service

Create `frontend/src/lib/offline/curriculumSync.ts`:

```typescript
import { getDB } from './database';
import { api } from '../api/client';

export async function syncCurriculum(frameworkId: string): Promise<void> {
  const db = await getDB();

  // Fetch and cache frameworks
  const frameworks = await api.get('/api/v1/frameworks');
  const tx1 = db.transaction('frameworks', 'readwrite');
  await Promise.all([
    ...frameworks.data.map((f: any) => tx1.store.put(f)),
    tx1.done
  ]);

  // Fetch and cache subjects for this framework
  const subjects = await api.get(`/api/v1/subjects?framework_id=${frameworkId}`);
  const tx2 = db.transaction('subjects', 'readwrite');
  await Promise.all([
    ...subjects.data.map((s: any) => tx2.store.put(s)),
    tx2.done
  ]);

  // Fetch and cache outcomes (paginated)
  let page = 1;
  let hasMore = true;
  const tx3 = db.transaction('outcomes', 'readwrite');

  while (hasMore) {
    const outcomes = await api.get(
      `/api/v1/curriculum/outcomes?framework_id=${frameworkId}&page=${page}&limit=100`
    );
    await Promise.all(outcomes.data.map((o: any) => tx3.store.put(o)));
    hasMore = outcomes.data.length === 100;
    page++;
  }
  await tx3.done;

  // Update metadata
  const metaTx = db.transaction('metadata', 'readwrite');
  await metaTx.store.put({
    key: `curriculum_sync_${frameworkId}`,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await metaTx.done;
}

export async function getOfflineSubjects(frameworkId: string) {
  const db = await getDB();
  return db.getAllFromIndex('subjects', 'by-framework', frameworkId);
}

export async function getOfflineOutcomes(subjectId: string) {
  const db = await getDB();
  return db.getAllFromIndex('outcomes', 'by-subject', subjectId);
}
```

### 3.2 Offline-First React Query Wrapper

Create `frontend/src/lib/offline/offlineQuery.ts`:

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getDB } from './database';

export function useOfflineQuery<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  offlineFetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { isOnline } = useOnlineStatus();

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isOnline) {
        try {
          return await fetcher();
        } catch (error) {
          // Fallback to offline data on network error
          return await offlineFetcher();
        }
      }
      return await offlineFetcher();
    },
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 min online, never stale offline
    ...options
  });
}
```

### 3.3 Offline Indicator Component

Create `frontend/src/components/ui/OfflineIndicator.tsx`:

```typescript
import { memo } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export const OfflineIndicator = memo(function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all',
        isOnline
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800'
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Back online - syncing...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>Offline - using cached data</span>
        </>
      )}
    </div>
  );
});
```

### 3.4 Deliverables
- [ ] `lib/offline/curriculumSync.ts`
- [ ] `lib/offline/offlineQuery.ts`
- [ ] `components/ui/OfflineIndicator.tsx`
- [ ] Curriculum auto-sync on app load
- [ ] Framework-filtered caching (framework_id in all queries)

---

## Phase 4: Background Sync (Days 8-10)

### 4.1 Pending Operations Queue

Create `frontend/src/lib/offline/syncQueue.ts`:

```typescript
import { getDB } from './database';
import { api } from '../api/client';
import { v4 as uuidv4 } from 'uuid';

interface PendingOperation {
  id: string;
  type: 'flashcard_answer' | 'session_create' | 'goal_update';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: unknown;
  created_at: string;
  retry_count: number;
}

export async function queueOperation(
  type: PendingOperation['type'],
  endpoint: string,
  method: PendingOperation['method'],
  payload: unknown
): Promise<void> {
  const db = await getDB();
  await db.add('pendingSync', {
    id: uuidv4(),
    type,
    endpoint,
    method,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0
  });
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const db = await getDB();
  const pending = await db.getAll('pendingSync');

  let success = 0;
  let failed = 0;

  for (const op of pending) {
    try {
      await api.request({
        url: op.endpoint,
        method: op.method,
        data: op.payload
      });

      await db.delete('pendingSync', op.id);
      success++;
    } catch (error) {
      // Increment retry count
      const updated = { ...op, retry_count: op.retry_count + 1 };

      if (updated.retry_count >= 5) {
        // Max retries reached, remove from queue
        await db.delete('pendingSync', op.id);
        failed++;
      } else {
        await db.put('pendingSync', updated);
      }
    }
  }

  return { success, failed };
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingSync');
}
```

### 4.2 Auto-Sync on Reconnection

Create `frontend/src/lib/offline/autoSync.ts`:

```typescript
import { processSyncQueue } from './syncQueue';
import { syncCurriculum } from './curriculumSync';

export function setupAutoSync(frameworkId: string) {
  // Listen for online event
  window.addEventListener('studyhub:online', async () => {
    console.log('Back online - starting sync...');

    // Process pending operations
    const result = await processSyncQueue();
    console.log(`Sync complete: ${result.success} succeeded, ${result.failed} failed`);

    // Refresh curriculum data
    await syncCurriculum(frameworkId);
  });
}
```

### 4.3 Sync Status Indicator

Create `frontend/src/components/ui/SyncStatus.tsx`:

```typescript
import { memo, useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { getPendingCount } from '@/lib/offline/syncQueue';

export const SyncStatus = memo(function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return (
      <div className="flex items-center gap-1 text-green-600" title="All synced">
        <Cloud className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">All changes synced</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 text-amber-600"
      title={`${pendingCount} pending`}
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <CloudOff className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="text-xs">{pendingCount}</span>
      <span className="sr-only">{pendingCount} changes pending sync</span>
    </div>
  );
});
```

### 4.4 Deliverables
- [ ] `lib/offline/syncQueue.ts`
- [ ] `lib/offline/autoSync.ts`
- [ ] `components/ui/SyncStatus.tsx`
- [ ] Auto-sync on reconnection
- [ ] Retry logic with exponential backoff

---

## Phase 5: Push Notifications (Days 11-12)

### 5.1 Backend: Push Subscription Endpoint

Create `backend/app/api/v1/endpoints/push.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/push", tags=["push"])

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # p256dh, auth

@router.post("/subscribe")
async def subscribe_push(
    subscription: PushSubscription,
    current_user: User = Depends(get_current_user)
):
    """Store push subscription for user."""
    # Store in user preferences
    # Implementation depends on push service choice
    pass

@router.delete("/unsubscribe")
async def unsubscribe_push(
    current_user: User = Depends(get_current_user)
):
    """Remove push subscription for user."""
    pass
```

### 5.2 Frontend: Notification Permission Request

Create `frontend/src/components/ui/NotificationPrompt.tsx`:

```typescript
import { memo, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './Button';

interface NotificationPromptProps {
  onDismiss: () => void;
}

export const NotificationPrompt = memo(function NotificationPrompt({
  onDismiss
}: NotificationPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermission = useCallback(async () => {
    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Subscribe to push notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
        });

        // Send subscription to backend
        await fetch('/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON())
        });
      }
      onDismiss();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  }, [onDismiss]);

  // Don't show if notifications not supported or already granted/denied
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="notification-prompt-title"
      className="fixed bottom-20 right-4 z-50 w-80 rounded-lg bg-white p-4 shadow-xl border"
    >
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <Bell className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 id="notification-prompt-title" className="font-medium">
            Stay on track
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Get reminders for study sessions and celebrate your achievements!
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={requestPermission}
              loading={isRequesting}
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### 5.3 Service Worker Push Handler

The Vite PWA plugin auto-generates the service worker, but we need to add push handling. Create a custom service worker source if needed.

### 5.4 Deliverables
- [ ] Backend push subscription endpoint
- [ ] Frontend notification permission UI
- [ ] Push event handling in service worker
- [ ] Study reminder notifications
- [ ] Achievement celebration notifications

---

## Phase 6: Testing (Days 13-14)

### 6.1 Unit Tests

Create `frontend/src/lib/offline/__tests__/`:

| Test File | Coverage |
|-----------|----------|
| `database.test.ts` | DB creation, schema, CRUD |
| `curriculumSync.test.ts` | Sync logic, framework filtering |
| `syncQueue.test.ts` | Queue operations, retry logic |
| `offlineQuery.test.ts` | Fallback behavior |

### 6.2 Component Tests

| Component | Tests |
|-----------|-------|
| `OfflineIndicator` | Online/offline states, accessibility |
| `SyncStatus` | Pending count, syncing state |
| `NotificationPrompt` | Permission flow, dismiss |

### 6.3 Integration Tests

- [ ] Offline curriculum access
- [ ] Pending sync queue processing
- [ ] Online → Offline → Online cycle
- [ ] Push notification subscription

### 6.4 E2E Tests (Playwright)

```typescript
test('can access curriculum while offline', async ({ page, context }) => {
  // Load app online first
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Go offline
  await context.setOffline(true);

  // Should still show subjects
  await page.goto('/subjects');
  await expect(page.getByText('Mathematics')).toBeVisible();

  // Should show offline indicator
  await expect(page.getByRole('status')).toContainText('Offline');
});
```

### 6.5 Lighthouse Audit

Target scores:
- Performance: 90+
- PWA: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 90+

### 6.6 Deliverables
- [ ] Unit tests for offline modules
- [ ] Component tests for UI
- [ ] E2E tests for offline flows
- [ ] Lighthouse audit passing 90+
- [ ] Security audit for cached data

---

## Phase 7: Documentation

### 7.1 API Documentation
- [ ] Push notification endpoints documented
- [ ] Offline behavior documented in API docs

### 7.2 User Documentation
- [ ] How to install as PWA
- [ ] Offline capabilities explained
- [ ] Notification settings guide

### 7.3 Developer Documentation
- [ ] IndexedDB schema reference
- [ ] Sync queue implementation notes
- [ ] Caching strategy documentation

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB quota exceeded | Medium | Low | Monitor storage usage, implement LRU eviction |
| Push notification service failure | Low | Medium | Graceful fallback to in-app notifications |
| Service worker cache corruption | High | Low | Cache versioning, force refresh mechanism |
| Offline data becomes stale | Medium | Medium | Show last sync time, prompt refresh |
| Background sync not supported | Low | Medium | Manual sync queue with visible status |

---

## Curriculum Considerations

- **Framework isolation**: All cached curriculum data keyed by `framework_id`
- **NSW first**: Initial sync targets NSW framework
- **Multi-framework ready**: Schema supports caching multiple frameworks
- **Offline revision**: Flashcards cached per student/subject

---

## Privacy/Security Checklist

- [ ] **No PII cached**: Email, phone, personal notes NOT in IndexedDB
- [ ] **Framework isolation**: Cache keyed by framework_id
- [ ] **Student ownership**: Verify before accessing cached flashcards
- [ ] **Auth tokens excluded**: Never cache authentication data
- [ ] **Push notification privacy**: No student identity in notification payload
- [ ] **Cache expiry**: Implement 30-day max age for curriculum data
- [ ] **HTTPS only**: Service worker won't activate on HTTP
- [ ] **Sync queue sanitized**: Only IDs and minimal data in pending operations

---

## File Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── pwa-maskable-192x192.png
│   ├── pwa-maskable-512x512.png
│   └── mask-icon.svg
├── src/
│   ├── lib/
│   │   └── offline/
│   │       ├── database.ts
│   │       ├── curriculumSync.ts
│   │       ├── syncQueue.ts
│   │       ├── autoSync.ts
│   │       ├── offlineQuery.ts
│   │       └── __tests__/
│   ├── hooks/
│   │   └── useOnlineStatus.ts
│   └── components/
│       └── ui/
│           ├── OfflineIndicator.tsx
│           ├── SyncStatus.tsx
│           └── NotificationPrompt.tsx
```

---

## Dependencies Summary

### Install
```bash
cd frontend && npm install idb
```

### Already Available
- vite-plugin-pwa: v0.19.2
- workbox: via vite-plugin-pwa
- @tanstack/react-query: v5.17.19
- zustand: v4.5.1
- lucide-react: icons

---

## Implementation Order

1. **Phase 1**: PWA Foundation (icons, manifest, meta tags)
2. **Phase 2**: IndexedDB Infrastructure (database, hooks)
3. **Phase 3**: Offline Curriculum (sync, caching, indicator)
4. **Phase 4**: Background Sync (queue, auto-sync, status)
5. **Phase 5**: Push Notifications (permission, subscription)
6. **Phase 6**: Testing (unit, component, E2E, Lighthouse)
7. **Phase 7**: Documentation

---

## Agent Assignment

| Phase | Recommended Agent |
|-------|-------------------|
| Phase 1 | `pwa-offline-specialist` |
| Phase 2-4 | `pwa-offline-specialist` |
| Phase 5 Backend | `backend-architect` |
| Phase 5 Frontend | `pwa-offline-specialist` |
| Phase 6 | `testing-qa-specialist` |
| Phase 7 | `full-stack-developer` |
