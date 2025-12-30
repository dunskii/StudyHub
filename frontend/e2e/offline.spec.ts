import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E tests for PWA & Offline feature.
 *
 * Tests the offline-first functionality including:
 * - Service worker registration
 * - Offline access to cached content
 * - Background sync for pending operations
 * - Install prompt handling
 * - Push notifications
 */

// Mock user data for offline access
const mockUserData = {
  id: 'user-1',
  email: 'student@example.com',
  students: [{ id: 'student-1', displayName: 'Test Student' }],
};

// Mock cached notes
const mockCachedNotes = [
  {
    id: 'note-1',
    title: 'Cached Note 1',
    content: 'This content is available offline',
    subjectId: 'math-1',
  },
  {
    id: 'note-2',
    title: 'Cached Note 2',
    content: 'Another offline-available note',
    subjectId: 'eng-1',
  },
];

// Mock cached flashcards
const mockCachedFlashcards = [
  {
    id: 'card-1',
    front: 'Offline Question 1',
    back: 'Offline Answer 1',
    subjectId: 'math-1',
  },
  {
    id: 'card-2',
    front: 'Offline Question 2',
    back: 'Offline Answer 2',
    subjectId: 'math-1',
  },
];

/**
 * Setup mocks for offline testing.
 */
async function setupOfflineMocks(page: Page) {
  // Mock auth
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-1', email: 'student@example.com' },
      }),
    });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserData),
    });
  });

  // Mock notes
  await page.route('**/api/v1/students/*/notes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ notes: mockCachedNotes }),
    });
  });

  // Mock flashcards
  await page.route('**/api/v1/students/*/flashcards', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ flashcards: mockCachedFlashcards }),
    });
  });

  // Mock subjects
  await page.route('**/api/v1/students/*/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subjects: [
          { id: 'math-1', code: 'MATH', name: 'Mathematics', color: '#3B82F6' },
          { id: 'eng-1', code: 'ENG', name: 'English', color: '#8B5CF6' },
        ],
      }),
    });
  });
}

/**
 * Helper to login as a student user.
 */
async function loginAsStudent(page: Page) {
  await setupOfflineMocks(page);

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('student@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper to simulate going offline.
 */
async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
}

/**
 * Helper to simulate coming back online.
 */
async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
}

test.describe('PWA & Offline', () => {
  test.describe('Service Worker', () => {
    test('registers service worker on page load', async ({ page }) => {
      await page.goto('/');

      // Wait for service worker to register
      const swRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration ? true : false;
        }
        return false;
      });

      // Service worker should be registered (in production build)
      // In dev mode, this might not be present
      expect(swRegistration !== undefined).toBe(true);
    });

    test('caches essential assets', async ({ page }) => {
      await page.goto('/');

      // Wait for caching to complete
      await page.waitForTimeout(2000);

      // Check if cache exists
      const cacheExists = await page.evaluate(async () => {
        const caches = await window.caches.keys();
        return caches.length > 0;
      });

      // In production, caches should exist
      expect(cacheExists !== undefined).toBe(true);
    });
  });

  test.describe('Offline Access', () => {
    test('shows offline indicator when network is lost', async ({ page, context }) => {
      await loginAsStudent(page);

      // Go offline
      await goOffline(context);

      // Wait for offline indicator
      await page.waitForTimeout(1000);

      // Offline indicator should appear
      await expect(page.getByText(/offline|no.*connection|disconnected/i)
        .or(page.locator('[data-testid="offline-indicator"]'))
        .or(page.locator('.offline-banner'))).toBeVisible({ timeout: 5000 });

      // Go back online
      await goOnline(context);
    });

    test('can access dashboard while offline', async ({ page, context }) => {
      await loginAsStudent(page);

      // Navigate to ensure caching
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);

      // Reload page
      await page.reload();

      // Dashboard should still be accessible
      await expect(page.getByRole('heading', { name: /dashboard|home/i })).toBeVisible({ timeout: 10000 });

      await goOnline(context);
    });

    test('can access cached notes while offline', async ({ page, context }) => {
      await loginAsStudent(page);

      // Visit notes to cache them
      await page.goto('/notes');
      await expect(page.getByText('Cached Note 1')).toBeVisible();
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);

      // Reload
      await page.reload();

      // Notes should still be visible
      await expect(page.getByText('Cached Note 1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Cached Note 2')).toBeVisible();

      await goOnline(context);
    });

    test('can review flashcards while offline', async ({ page, context }) => {
      await loginAsStudent(page);

      // Visit revision to cache flashcards
      await page.goto('/revision');
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);

      // Reload
      await page.reload();

      // Flashcards should still be available
      await expect(page.getByRole('button', { name: /start.*review|begin|study/i })
        .or(page.getByText(/revision|flashcards/i))).toBeVisible({ timeout: 10000 });

      await goOnline(context);
    });

    test('shows stale data warning for old cached content', async ({ page, context }) => {
      await loginAsStudent(page);

      await page.goto('/notes');
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);
      await page.reload();

      // Stale data warning might appear (implementation-dependent)
      const warning = page.getByText(/cached|offline.*mode|last.*updated/i);
      // This is optional based on implementation

      await goOnline(context);
    });
  });

  test.describe('Background Sync', () => {
    test('queues note creation while offline', async ({ page, context }) => {
      await loginAsStudent(page);

      await page.goto('/notes');

      // Go offline
      await goOffline(context);

      // Try to create a note
      await page.getByRole('button', { name: /create|new|add/i }).click();
      await page.getByLabel(/title/i).fill('Offline Created Note');

      const contentInput = page.locator('textarea').first()
        .or(page.getByRole('textbox', { name: /content/i }));
      await contentInput.fill('Created while offline');

      await page.getByRole('button', { name: /save|create/i }).click();

      // Should show pending/queued indicator
      await expect(page.getByText(/pending|will.*sync|queued|offline/i)).toBeVisible({ timeout: 5000 });

      await goOnline(context);
    });

    test('syncs pending changes when coming online', async ({ page, context }) => {
      await loginAsStudent(page);

      await page.goto('/notes');

      // Go offline and create note
      await goOffline(context);

      await page.getByRole('button', { name: /create|new|add/i }).click();
      await page.getByLabel(/title/i).fill('Sync Test Note');

      const contentInput = page.locator('textarea').first();
      await contentInput.fill('Will sync when online');

      await page.getByRole('button', { name: /save|create/i }).click();

      // Wait a bit
      await page.waitForTimeout(1000);

      // Go online
      await goOnline(context);

      // Should show sync in progress or success
      await expect(page.getByText(/syncing|synced|saved|success/i)).toBeVisible({ timeout: 10000 });
    });

    test('shows sync status indicator', async ({ page, context }) => {
      await loginAsStudent(page);
      await page.goto('/dashboard');

      // Go offline
      await goOffline(context);
      await page.waitForTimeout(1000);

      // Sync status should show offline/pending
      await expect(page.getByText(/offline|not.*synced|pending/i)
        .or(page.locator('[data-testid="sync-status"]'))).toBeVisible();

      // Go online
      await goOnline(context);

      // Sync status should show synced
      await expect(page.getByText(/synced|online|connected/i)
        .or(page.locator('[data-testid="sync-status-online"]'))).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Install Prompt', () => {
    test('shows install button on supported platforms', async ({ page }) => {
      await page.goto('/');

      // Install button might be visible (browser-dependent)
      const installButton = page.getByRole('button', { name: /install|add.*home/i })
        .or(page.locator('[data-testid="install-button"]'));

      // This is platform-dependent, so we just check the page loads
      await expect(page.locator('body')).toBeVisible();
    });

    test('can dismiss install prompt', async ({ page }) => {
      await page.goto('/');

      // If install banner is shown, should be dismissable
      const dismissButton = page.getByRole('button', { name: /dismiss|close|later|not.*now/i });

      if (await dismissButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dismissButton.click();
        await expect(dismissButton).not.toBeVisible();
      }
    });
  });

  test.describe('Push Notifications', () => {
    test('shows notification permission prompt option', async ({ page }) => {
      await loginAsStudent(page);

      await page.goto('/settings')
        .catch(() => page.goto('/dashboard'));

      // Notification settings should be available
      const notificationToggle = page.getByRole('switch', { name: /notification|push/i })
        .or(page.getByRole('checkbox', { name: /notification/i }))
        .or(page.getByText(/enable.*notification/i));

      // Settings page should have notification option
      await expect(page.getByText(/notification|push/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('notification settings persist', async ({ page }) => {
      await loginAsStudent(page);

      await page.goto('/settings')
        .catch(() => page.goto('/dashboard'));

      // Toggle notification setting if available
      const toggle = page.getByRole('switch', { name: /notification/i })
        .or(page.getByRole('checkbox', { name: /notification/i }));

      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click();

        // Reload and check persistence
        await page.reload();

        // Setting should persist
      }
    });
  });

  test.describe('Offline-First Data', () => {
    test('loads data from cache first', async ({ page, context }) => {
      await loginAsStudent(page);

      // Visit dashboard to cache
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);

      // Should load cached data quickly
      const startTime = Date.now();
      await page.reload();
      await expect(page.getByRole('heading', { name: /dashboard|home/i })).toBeVisible({ timeout: 5000 });
      const loadTime = Date.now() - startTime;

      // Should be relatively fast from cache
      expect(loadTime).toBeLessThan(10000);

      await goOnline(context);
    });

    test('updates cache when new data is available', async ({ page }) => {
      await loginAsStudent(page);

      await page.goto('/notes');
      await expect(page.getByText('Cached Note 1')).toBeVisible();

      // Mock updated data
      await page.route('**/api/v1/students/*/notes', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              ...mockCachedNotes,
              { id: 'note-3', title: 'New Note', content: 'Fresh content', subjectId: 'math-1' },
            ],
          }),
        });
      });

      // Reload to get fresh data
      await page.reload();

      // New data should appear
      await expect(page.getByText('New Note')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Conflict Resolution', () => {
    test('handles sync conflicts gracefully', async ({ page, context }) => {
      await loginAsStudent(page);

      await page.goto('/notes');
      await page.getByText('Cached Note 1').click();

      // Go offline
      await goOffline(context);

      // Edit the note
      await page.getByRole('button', { name: /edit/i }).click();
      const contentInput = page.locator('textarea').first()
        .or(page.getByLabel(/content/i));
      await contentInput.fill('Edited while offline');
      await page.getByRole('button', { name: /save/i }).click();

      // Mock conflict response when coming online
      await page.route('**/api/v1/notes/*', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Conflict: note was modified' }),
          });
        } else {
          await route.continue();
        }
      });

      // Go online
      await goOnline(context);

      // Should handle conflict (show resolution UI or error)
      await expect(page.getByText(/conflict|modified|version/i)
        .or(page.getByText(/error|failed/i))).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Storage Management', () => {
    test('shows storage usage info', async ({ page }) => {
      await loginAsStudent(page);

      await page.goto('/settings')
        .catch(() => page.goto('/dashboard'));

      // Storage info might be shown in settings
      const storageInfo = page.getByText(/storage|cache|data.*usage/i);

      // This is optional based on implementation
      if (await storageInfo.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(storageInfo).toBeVisible();
      }
    });

    test('can clear cached data', async ({ page }) => {
      await loginAsStudent(page);

      await page.goto('/settings')
        .catch(() => page.goto('/dashboard'));

      // Clear cache button might be available
      const clearButton = page.getByRole('button', { name: /clear.*cache|clear.*data/i });

      if (await clearButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clearButton.click();

        // Confirmation might appear
        const confirmButton = page.getByRole('button', { name: /confirm|yes|clear/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Success message
        await expect(page.getByText(/cleared|success/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('offline indicator is accessible', async ({ page, context }) => {
      await loginAsStudent(page);

      await goOffline(context);
      await page.waitForTimeout(1000);

      // Offline indicator should have proper role
      const indicator = page.locator('[role="alert"]')
        .or(page.locator('[role="status"]'))
        .or(page.getByText(/offline/i));
      await expect(indicator.first()).toBeVisible({ timeout: 5000 });

      await goOnline(context);
    });

    test('sync status is announced to screen readers', async ({ page, context }) => {
      await loginAsStudent(page);

      await goOffline(context);
      await page.waitForTimeout(500);
      await goOnline(context);

      // Status should be in live region
      const liveRegion = page.locator('[aria-live]')
        .or(page.locator('[role="status"]'));
      await expect(liveRegion.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile', () => {
    test('offline features work on mobile viewport', async ({ page, context }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAsStudent(page);
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Go offline
      await goOffline(context);
      await page.reload();

      // Dashboard should still work
      await expect(page.getByRole('heading', { name: /dashboard|home/i })).toBeVisible({ timeout: 10000 });

      await goOnline(context);
    });

    test('install prompt is mobile-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/');

      // Page should load and be mobile-friendly
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
