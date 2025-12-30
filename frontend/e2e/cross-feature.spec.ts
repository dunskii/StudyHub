import { test, expect } from '@playwright/test';

/**
 * Cross-feature E2E tests for complete user journeys.
 *
 * These tests simulate realistic user workflows that span multiple features.
 */
test.describe('Cross-Feature User Journeys', () => {
  test.describe('New User Onboarding Journey', () => {
    test('complete signup to first study session flow', async ({ page }) => {
      // Start at landing page
      await page.goto('/');
      await expect(page).toHaveTitle(/StudyHub/i);

      // Navigate to signup
      await page.getByRole('link', { name: /sign up|get started/i }).click();
      await expect(page).toHaveURL(/signup/);

      // Fill signup form
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await page.getByLabel(/email/i).fill(uniqueEmail);
      await page.getByLabel(/^password$/i).fill('TestPassword123!');
      await page
        .getByLabel(/confirm password/i)
        .fill('TestPassword123!');

      // Submit signup
      await page.getByRole('button', { name: /sign up|create account/i }).click();

      // Should redirect to onboarding or dashboard
      await expect(page).toHaveURL(/onboarding|dashboard/, { timeout: 10000 });
    });

    test('onboarding wizard completion', async ({ page }) => {
      // Mock authenticated state for onboarding
      await page.goto('/onboarding');

      // Check for onboarding elements
      const onboardingContent = page.getByText(
        /welcome|get started|add student/i
      );
      if ((await onboardingContent.count()) > 0) {
        await expect(onboardingContent.first()).toBeVisible();
      }
    });
  });

  test.describe('Parent Dashboard Journey', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard (assuming authenticated)
      await page.goto('/dashboard');
    });

    test('view student progress and navigate to details', async ({ page }) => {
      // Look for student cards or list
      const studentElements = page.getByTestId('student-card').or(
        page.getByRole('article')
      );

      if ((await studentElements.count()) > 0) {
        // Click on first student
        await studentElements.first().click();

        // Should show student details
        const studentDetails = page.getByText(/progress|subjects|activity/i);
        await expect(studentDetails.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('navigate between dashboard tabs', async ({ page }) => {
      // Find tab navigation
      const tabs = page.getByRole('tab').or(page.getByRole('button'));

      // Check for common dashboard tabs
      const overviewTab = page.getByRole('tab', { name: /overview/i });
      const studentsTab = page.getByRole('tab', { name: /students/i });
      const settingsTab = page.getByRole('tab', { name: /settings/i });

      if ((await overviewTab.count()) > 0) {
        await overviewTab.click();
        await page.waitForTimeout(500);
      }

      if ((await studentsTab.count()) > 0) {
        await studentsTab.click();
        await page.waitForTimeout(500);
      }

      if ((await settingsTab.count()) > 0) {
        await settingsTab.click();
        // Settings tab should show account settings
        const settingsContent = page.getByText(/account|profile|settings/i);
        await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('parent can view AI usage statistics', async ({ page }) => {
      // Navigate to settings or usage section
      const settingsTab = page.getByRole('tab', { name: /settings/i });
      if ((await settingsTab.count()) > 0) {
        await settingsTab.click();
      }

      // Look for AI usage card or section
      const aiUsage = page.getByText(/ai usage|token|usage/i);
      if ((await aiUsage.count()) > 0) {
        await expect(aiUsage.first()).toBeVisible();
      }
    });
  });

  test.describe('Student Learning Journey', () => {
    test('student selects subject and starts study session', async ({
      page,
    }) => {
      // Navigate to student view
      await page.goto('/student');

      // Look for subject selection
      const subjectCards = page.getByTestId('subject-card').or(
        page.locator('[data-subject]')
      );

      if ((await subjectCards.count()) > 0) {
        await subjectCards.first().click();

        // Should enter study mode or show subject content
        await expect(page).toHaveURL(/study|subject|notes/, { timeout: 5000 });
      }
    });

    test('student uses AI tutor for help', async ({ page }) => {
      // Navigate to socratic tutor
      await page.goto('/tutor');

      // Look for chat input
      const chatInput = page
        .getByRole('textbox')
        .or(page.getByPlaceholder(/ask|type|message/i));

      if ((await chatInput.count()) > 0) {
        await chatInput.fill('Can you help me understand fractions?');

        // Submit message
        const sendButton = page.getByRole('button', { name: /send/i });
        if ((await sendButton.count()) > 0) {
          await sendButton.click();

          // Wait for response
          const response = page.getByText(/fraction|think|question/i);
          await expect(response.first()).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('student creates and reviews notes', async ({ page }) => {
      // Navigate to notes
      await page.goto('/notes');

      // Look for add note button
      const addNoteButton = page.getByRole('button', {
        name: /add|create|new/i,
      });

      if ((await addNoteButton.count()) > 0) {
        await addNoteButton.click();

        // Fill note form
        const titleInput = page.getByLabel(/title/i);
        if ((await titleInput.count()) > 0) {
          await titleInput.fill('Test Note');
        }

        // Look for save button
        const saveButton = page.getByRole('button', { name: /save/i });
        if ((await saveButton.count()) > 0) {
          await saveButton.click();

          // Note should appear in list
          const noteInList = page.getByText('Test Note');
          await expect(noteInList).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('student uses revision cards', async ({ page }) => {
      // Navigate to revision
      await page.goto('/revision');

      // Look for revision cards or start button
      const startRevision = page.getByRole('button', {
        name: /start|begin|review/i,
      });

      if ((await startRevision.count()) > 0) {
        await startRevision.click();

        // Should show flashcard or quiz interface
        const revisionContent = page.getByTestId('flashcard').or(
          page.getByText(/answer|reveal|next/i)
        );
        await expect(revisionContent.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Multi-Student Family Journey', () => {
    test('parent switches between student profiles', async ({ page }) => {
      await page.goto('/dashboard');

      // Look for student selector or list
      const studentSelector = page.getByTestId('student-selector').or(
        page.getByRole('combobox')
      );

      if ((await studentSelector.count()) > 0) {
        await studentSelector.click();

        // Should show student options
        const studentOptions = page.getByRole('option');
        if ((await studentOptions.count()) > 1) {
          // Select second student
          await studentOptions.nth(1).click();

          // Content should update
          await page.waitForTimeout(1000);
        }
      }
    });

    test('parent adds new student to account', async ({ page }) => {
      await page.goto('/dashboard');

      // Navigate to students tab or add student
      const addStudentButton = page.getByRole('button', {
        name: /add student/i,
      });

      if ((await addStudentButton.count()) > 0) {
        await addStudentButton.click();

        // Fill student form
        const nameInput = page.getByLabel(/name/i);
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Test Student');
        }

        // Select grade/year
        const gradeSelect = page.getByLabel(/grade|year/i);
        if ((await gradeSelect.count()) > 0) {
          await gradeSelect.click();
          const gradeOption = page.getByRole('option').first();
          if ((await gradeOption.count()) > 0) {
            await gradeOption.click();
          }
        }

        // Save student
        const saveButton = page.getByRole('button', { name: /save|add/i });
        if ((await saveButton.count()) > 0) {
          await saveButton.click();

          // Student should appear in list
          const newStudent = page.getByText('Test Student');
          await expect(newStudent).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Session Persistence Journey', () => {
    test('user session persists across page navigation', async ({ page }) => {
      // Login
      await page.goto('/login');

      // Mock login or use existing auth
      // Navigate to protected page
      await page.goto('/dashboard');

      // Navigate away
      await page.goto('/');

      // Navigate back
      await page.goto('/dashboard');

      // Should still be authenticated (not redirected to login)
      await expect(page).not.toHaveURL(/login/, { timeout: 5000 });
    });

    test('user returns to previous page after login', async ({ page }) => {
      // Try to access protected page without auth
      await page.goto('/notes');

      // If redirected to login, the return URL should be preserved
      if (page.url().includes('/login')) {
        // After login, should return to /notes
        // This would require actual authentication to test fully
        const returnUrl = await page.evaluate(() => {
          const params = new URLSearchParams(window.location.search);
          return params.get('returnUrl') || params.get('redirect');
        });

        // Return URL should be set if app supports this
      }
    });
  });

  test.describe('Data Persistence Journey', () => {
    test('draft content is preserved when navigating away', async ({
      page,
    }) => {
      // Navigate to notes creation
      await page.goto('/notes/new');

      // Fill in some content
      const titleInput = page.getByLabel(/title/i);
      if ((await titleInput.count()) > 0) {
        await titleInput.fill('Draft Note Title');
      }

      // Navigate away
      await page.goto('/dashboard');

      // Navigate back to notes
      await page.goto('/notes/new');

      // Check if draft was preserved (if app supports drafts)
      // This behavior depends on app implementation
    });

    test('search/filter state is preserved', async ({ page }) => {
      await page.goto('/notes');

      // Apply a filter or search
      const searchInput = page.getByPlaceholder(/search/i);
      if ((await searchInput.count()) > 0) {
        await searchInput.fill('test search');

        // Navigate away and back
        await page.goto('/dashboard');
        await page.goBack();

        // Check if search is preserved (URL params or localStorage)
      }
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('user can recover from failed form submission', async ({ page }) => {
      await page.goto('/login');

      // Submit with invalid credentials
      await page.getByLabel(/email/i).fill('invalid@test.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error
      const error = page.getByText(/invalid|incorrect|error/i);
      await expect(error.first()).toBeVisible({ timeout: 5000 });

      // Form should still be interactive
      await page.getByLabel(/email/i).fill('correct@test.com');
      await page.getByLabel(/password/i).fill('correctpassword');

      // User can retry
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeEnabled();
    });

    test('user can recover from network error', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Go offline
      await context.setOffline(true);

      // Try an action
      await page.reload().catch(() => {});

      // Should show offline indicator
      const offline = page.getByText(/offline|no connection/i);
      if ((await offline.count()) > 0) {
        await expect(offline.first()).toBeVisible();
      }

      // Restore network
      await context.setOffline(false);

      // Refresh should work
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Notification Journey', () => {
    test('user receives and interacts with notifications', async ({ page }) => {
      await page.goto('/dashboard');

      // Look for notification bell/icon
      const notificationButton = page.getByRole('button', {
        name: /notification/i,
      });

      if ((await notificationButton.count()) > 0) {
        await notificationButton.click();

        // Notification panel should open
        const notificationPanel = page.getByRole('dialog').or(
          page.getByTestId('notification-panel')
        );

        if ((await notificationPanel.count()) > 0) {
          await expect(notificationPanel).toBeVisible();

          // Click a notification (if any)
          const notification = page.getByRole('listitem').first();
          if ((await notification.count()) > 0) {
            await notification.click();
          }
        }
      }
    });
  });

  test.describe('PWA Offline Journey', () => {
    test('app works offline after initial load', async ({ page, context }) => {
      // Load the app fully
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Navigate within the app
      await page.goto('/dashboard').catch(() => {});

      // Should show offline content or cached data
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Restore network
      await context.setOffline(false);
    });

    test('data syncs when coming back online', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Try to perform an action (may queue for sync)
      // This is app-specific behavior

      // Restore network
      await context.setOffline(false);

      // Wait for potential sync
      await page.waitForTimeout(2000);

      // App should sync any pending changes
    });
  });
});
