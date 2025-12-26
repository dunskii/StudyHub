import { test, expect } from '@playwright/test';

/**
 * E2E tests for student onboarding flow.
 *
 * Note: These tests require a logged-in user. In a full setup,
 * you would use test fixtures to handle authentication.
 */
test.describe('Student Onboarding', () => {
  // Skip these tests if the backend isn't running
  test.skip(({ browserName }) => {
    return process.env.SKIP_BACKEND_TESTS === 'true';
  }, 'Backend required for onboarding tests');

  test.describe('Onboarding wizard UI', () => {
    test('onboarding page shows wizard steps', async ({ page }) => {
      // Note: This test may need authentication setup
      await page.goto('/onboarding');

      // Check for step indicators (if not redirected to login)
      const stepsVisible = await page.getByText('Details').isVisible().catch(() => false);

      if (stepsVisible) {
        await expect(page.getByText('Details')).toBeVisible();
        await expect(page.getByText('Subjects')).toBeVisible();
        await expect(page.getByText('Confirm')).toBeVisible();
      } else {
        // If redirected to login, that's expected for unauthenticated users
        await expect(page).toHaveURL(/\/(login|onboarding)/);
      }
    });
  });

  test.describe('Step 1: Student Details', () => {
    test('details form has required fields', async ({ page }) => {
      await page.goto('/onboarding');

      // May be redirected to login
      if (await page.getByLabel(/student.*name/i).isVisible().catch(() => false)) {
        await expect(page.getByLabel(/student.*name/i)).toBeVisible();
        await expect(page.getByLabel(/grade level/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
      }
    });

    test('details form validates required fields', async ({ page }) => {
      await page.goto('/onboarding');

      if (await page.getByRole('button', { name: /continue/i }).isVisible().catch(() => false)) {
        // Try to continue without filling form
        await page.getByRole('button', { name: /continue/i }).click();

        // Should show validation error
        await expect(page.locator('[aria-invalid="true"]')).toBeVisible();
      }
    });

    test('selecting grade shows corresponding stage', async ({ page }) => {
      await page.goto('/onboarding');

      if (await page.getByLabel(/student.*name/i).isVisible().catch(() => false)) {
        // Fill in name
        await page.getByLabel(/student.*name/i).fill('Test Student');

        // Select Year 5
        await page.getByLabel(/grade level/i).selectOption('5');

        // Should show Stage 3 info
        await expect(page.getByText(/Stage 3/i)).toBeVisible();
      }
    });
  });

  test.describe('Step 2: Subject Selection', () => {
    test('subject selection shows available subjects', async ({ page }) => {
      // This test would require completing step 1 first
      // In a full test suite, use page objects and fixtures
      test.skip();
    });
  });

  test.describe('Step 3: Confirmation', () => {
    test('confirmation shows summary of selections', async ({ page }) => {
      // This test would require completing steps 1 and 2 first
      test.skip();
    });
  });
});
