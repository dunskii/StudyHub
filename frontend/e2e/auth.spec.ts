import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows.
 */
test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title and form elements
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page has links to signup and forgot password', async ({ page }) => {
    await page.goto('/login');

    // Check navigation links
    const signupLink = page.getByRole('link', { name: /sign up/i });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute('href', '/signup');

    const forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotPasswordLink).toBeVisible();
    await expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check page title and form elements
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account|sign up/i })).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');

    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('login form shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation errors
    // Note: The actual error messages depend on the component implementation
    await expect(page.locator('[aria-invalid="true"]')).toBeVisible();
  });

  test('signup form validates password confirmation', async ({ page }) => {
    await page.goto('/signup');

    // Fill in email and mismatched passwords
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword123!');

    // Submit form
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Should show password mismatch error
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
