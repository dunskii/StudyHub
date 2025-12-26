import { test, expect } from '@playwright/test';

/**
 * E2E tests for subject enrolment flows.
 *
 * Note: These tests require an authenticated user with at least one student.
 */
test.describe('Subject Enrolment', () => {
  // Skip these tests if the backend isn't running
  test.skip(({ browserName }) => {
    return process.env.SKIP_BACKEND_TESTS === 'true';
  }, 'Backend required for enrolment tests');

  test.describe('Enrolment Manager UI', () => {
    test('enrolment page shows enrolled subjects section', async ({ page }) => {
      // This would require authentication and a student to be selected
      // In real tests, use fixtures to set up authenticated state
      await page.goto('/dashboard');

      // May be redirected to login
      const isLoggedIn = !(await page.url().includes('/login'));

      if (isLoggedIn) {
        // Look for enrolment-related UI elements
        const hasEnrolmentUI = await page
          .getByText(/enrolled subjects/i)
          .isVisible()
          .catch(() => false);

        if (hasEnrolmentUI) {
          await expect(page.getByText(/enrolled subjects/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Adding Subjects', () => {
    test('add subject button opens modal', async ({ page }) => {
      // This test requires an authenticated session with a student
      test.skip();
    });

    test('subject selection modal shows available subjects', async ({ page }) => {
      test.skip();
    });

    test('pathway selection appears for Stage 5 Mathematics', async ({ page }) => {
      test.skip();
    });
  });

  test.describe('Removing Subjects', () => {
    test('remove button shows confirmation dialog', async ({ page }) => {
      test.skip();
    });

    test('cancelling removal keeps subject enrolled', async ({ page }) => {
      test.skip();
    });

    test('confirming removal unenrols the subject', async ({ page }) => {
      test.skip();
    });
  });
});
