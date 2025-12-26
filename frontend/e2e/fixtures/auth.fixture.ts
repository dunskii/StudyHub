import { test as base, Page } from '@playwright/test';

/**
 * Authentication fixture for E2E tests.
 *
 * Provides a way to create authenticated test contexts.
 */

// Test user credentials (for development/testing only)
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

/**
 * Extended test fixture with authentication helpers.
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Go to login page
    await page.goto('/login');

    // Fill in credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Use the authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to login programmatically (for faster tests).
 */
export async function loginUser(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper to logout.
 */
export async function logoutUser(page: Page) {
  // Look for logout button or link
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
}
