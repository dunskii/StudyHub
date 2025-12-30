import { test, expect } from '@playwright/test';

/**
 * E2E tests for error handling scenarios.
 *
 * Tests application resilience to network errors, API failures, and edge cases.
 */
test.describe('Error Scenarios', () => {
  test.describe('Network Errors', () => {
    test('shows offline indicator when network is disconnected', async ({ page, context }) => {
      // Navigate to app first
      await page.goto('/');

      // Simulate offline mode
      await context.setOffline(true);

      // Try to navigate or perform an action
      await page.goto('/dashboard').catch(() => {});

      // Should show offline indicator
      const offlineIndicator = page.getByText(/offline|no internet|connection/i);
      await expect(offlineIndicator).toBeVisible({ timeout: 10000 });

      // Restore network
      await context.setOffline(false);
    });

    test('recovers gracefully when network is restored', async ({ page, context }) => {
      await page.goto('/');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Go back online
      await context.setOffline(false);

      // Should recover - page should be interactive
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles slow network gracefully', async ({ page }) => {
      // Throttle network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50kb/s
        uploadThroughput: 50 * 1024,
        latency: 2000, // 2 second latency
      });

      await page.goto('/', { timeout: 30000 });

      // Page should still load
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('API Error Handling', () => {
    test('displays user-friendly error message on 500 error', async ({ page }) => {
      // Intercept API calls and return 500
      await page.route('**/api/v1/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error_code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          }),
        });
      });

      await page.goto('/dashboard');

      // Should show error message (not raw error)
      const errorMessage = page.getByText(/error|something went wrong|try again/i);
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Should NOT show technical details to user
      await expect(page.getByText(/500|internal server/i)).not.toBeVisible();
    });

    test('handles rate limiting gracefully', async ({ page }) => {
      // Intercept and return 429
      await page.route('**/api/v1/**', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error_code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          }),
        });
      });

      await page.goto('/dashboard');

      // Should show rate limit message
      const rateLimitMessage = page.getByText(/too many|wait|slow down/i);
      await expect(rateLimitMessage).toBeVisible({ timeout: 10000 });
    });

    test('handles authentication expiry gracefully', async ({ page }) => {
      // Intercept and return 401
      await page.route('**/api/v1/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error_code: 'TOKEN_EXPIRED',
            message: 'Session expired',
          }),
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login or show session expired message
      await expect(page).toHaveURL(/login|signin/, { timeout: 10000 });
    });
  });

  test.describe('Form Error Handling', () => {
    test('shows validation errors without page reload', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation errors inline
      const emailError = page.getByText(/email.*required|enter.*email/i);
      await expect(emailError).toBeVisible();

      // Page should not have reloaded (form state preserved)
      await expect(page).toHaveURL(/login/);
    });

    test('clears errors when user starts typing', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form to trigger errors
      await page.getByRole('button', { name: /sign in/i }).click();

      // Error should be visible
      const emailError = page.getByText(/email.*required|enter.*email/i);
      await expect(emailError).toBeVisible();

      // Start typing in email field
      await page.getByLabel(/email/i).fill('test@example.com');

      // Error should be cleared or hidden
      await expect(emailError).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('404 and Not Found', () => {
    test('shows 404 page for unknown routes', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');

      // Should show 404 or not found message
      const notFoundMessage = page.getByText(/not found|404|page.*exist/i);
      await expect(notFoundMessage).toBeVisible();

      // Should have link back to home
      const homeLink = page.getByRole('link', { name: /home|back|return/i });
      await expect(homeLink).toBeVisible();
    });

    test('404 page maintains app layout', async ({ page }) => {
      await page.goto('/unknown-page-xyz');

      // Should still have navigation/header
      const header = page.locator('header, nav, [role="navigation"]');
      await expect(header.first()).toBeVisible();
    });
  });

  test.describe('Timeout Handling', () => {
    test('shows loading state during slow requests', async ({ page }) => {
      // Add delay to API responses
      await page.route('**/api/v1/**', async (route) => {
        await new Promise((r) => setTimeout(r, 3000)); // 3 second delay
        route.continue();
      });

      await page.goto('/dashboard');

      // Should show loading indicator
      const loadingIndicator = page.getByRole('status').or(
        page.getByText(/loading/i)
      ).or(
        page.locator('[aria-busy="true"]')
      );
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Edge Cases', () => {
    test('handles empty state gracefully', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/v1/students/**/notes**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [], total: 0 }),
        });
      });

      await page.goto('/notes');

      // Should show empty state message
      const emptyMessage = page.getByText(/no notes|empty|get started|add.*first/i);
      await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    });

    test('handles very long content without breaking layout', async ({ page }) => {
      await page.goto('/');

      // Check no horizontal scrollbar on body
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });
});
