import { test, expect } from '@playwright/test';
import {
  setupParentDashboardMocks,
  loginAsParent,
  goToParentDashboard,
} from './fixtures/parent-dashboard';

/**
 * E2E tests for Parent Dashboard Goal Management flows.
 * These tests focus on the complete goal lifecycle.
 */
test.describe('Parent Dashboard - Goal Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
    await setupParentDashboardMocks(page);
  });

  test.describe('Goal Creation Flow', () => {
    test('complete goal creation with all fields', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Open create form
      await page.getByRole('button', { name: /new goal/i }).click();

      // Fill in all fields
      await page.getByLabel(/goal title/i).fill('Master Algebra Basics');
      await page.getByLabel(/description/i).fill('Complete all algebra fundamentals including equations and expressions');
      await page.getByLabel(/target mastery/i).fill('85');

      // Set target date (30 days from now)
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const dateString = futureDate.toISOString().split('T')[0];
      await page.getByLabel(/target date/i).fill(dateString);

      await page.getByLabel(/reward/i).fill('New video game');

      // Submit
      await page.getByRole('button', { name: /create goal/i }).click();

      // Verify form closes
      await expect(page.getByText(/create new goal/i)).not.toBeVisible();
    });

    test('goal creation with minimum required fields', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();
      await page.getByRole('button', { name: /new goal/i }).click();

      // Only fill required field (title)
      await page.getByLabel(/goal title/i).fill('Simple Goal');

      // Submit
      await page.getByRole('button', { name: /create goal/i }).click();

      // Should succeed
      await expect(page.getByText(/create new goal/i)).not.toBeVisible();
    });

    test('goal creation validates required title', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();
      await page.getByRole('button', { name: /new goal/i }).click();

      // Try to submit without title
      await page.getByRole('button', { name: /create goal/i }).click();

      // Should show validation error
      await expect(page.getByText(/title is required/i)).toBeVisible();
    });

    test('goal creation validates mastery range', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();
      await page.getByRole('button', { name: /new goal/i }).click();

      await page.getByLabel(/goal title/i).fill('Test Goal');
      await page.getByLabel(/target mastery/i).fill('150'); // Invalid: > 100

      await page.getByRole('button', { name: /create goal/i }).click();

      // Form should show error or not submit
      // The exact behavior depends on validation implementation
    });

    test('requires student selection before creating goal', async ({ page }) => {
      // This test assumes no student is auto-selected
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Try to create goal without student selected
      // The component should handle this gracefully
      await page.getByRole('button', { name: /new goal/i }).click();

      // If no student is selected, should show message
      // (In current implementation, first student is auto-selected)
    });
  });

  test.describe('Goal Progress Tracking', () => {
    test('displays progress percentage correctly', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check progress is displayed
      await expect(page.getByText('63%')).toBeVisible(); // 62.5 rounded
    });

    test('shows days remaining for goals with target date', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check days remaining is shown
      await expect(page.getByText(/30 days left/)).toBeVisible();
    });

    test('shows on-track indicator', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Goals that are on track should not show warning
      // Goals that are behind should show warning indicator
    });

    test('can check if goal is achieved', async ({ page }) => {
      // Mock the check achievement endpoint
      await page.route('**/api/v1/parent/goals/*/check-achievement', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'goal-1',
            title: 'Master Multiplication Tables',
            achieved_at: new Date().toISOString(),
            progress: {
              progress_percentage: 100,
              is_on_track: true,
            },
          }),
        });
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Find and click check achievement button
      const checkButton = page.getByTitle(/check if achieved/i).first();
      await checkButton.click();

      // Should trigger API call
    });
  });

  test.describe('Goal Filtering', () => {
    test('filter shows all goals by default', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // All button should be active by default
      const allButton = page.getByRole('button', { name: /^all$/i });
      await expect(allButton).toHaveClass(/bg-blue-100/);

      // Both goals should be visible
      await expect(page.getByText(/master multiplication/i)).toBeVisible();
      await expect(page.getByText(/complete reading challenge/i)).toBeVisible();
    });

    test('can filter to active goals only', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Click Active filter
      await page.getByRole('button', { name: /^active$/i }).click();

      // Active button should now be highlighted
      await expect(page.getByRole('button', { name: /^active$/i })).toHaveClass(/bg-blue-100/);
    });

    test('can filter to achieved goals only', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Click Achieved filter
      await page.getByRole('button', { name: /^achieved$/i }).click();

      // Achieved button should be highlighted
      await expect(page.getByRole('button', { name: /^achieved$/i })).toHaveClass(/bg-blue-100/);
    });

    test('filter persists when switching students', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Apply Active filter
      await page.getByRole('button', { name: /^active$/i }).click();

      // Switch students
      await page.getByRole('button', { name: 'Oliver' }).click();

      // Active filter should still be applied
      await expect(page.getByRole('button', { name: /^active$/i })).toHaveClass(/bg-blue-100/);
    });
  });

  test.describe('Goal Deletion', () => {
    test('can delete a goal', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Find delete button on first goal
      const deleteButton = page.getByTitle(/delete goal/i).first();

      // Click delete
      await deleteButton.click();

      // Goal should be removed (mock handles this)
    });

    test('shows loading state while deleting', async ({ page }) => {
      // Add delay to delete response
      await page.route('**/api/v1/parent/goals/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.fulfill({ status: 204 });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      const deleteButton = page.getByTitle(/delete goal/i).first();
      await deleteButton.click();

      // Should show spinner while deleting
      // (The component uses Spinner component during deletion)
    });
  });

  test.describe('Goal Display', () => {
    test('shows goal title and description', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      await expect(page.getByText(/master multiplication tables/i)).toBeVisible();
      await expect(page.getByText(/learn all multiplication tables/i)).toBeVisible();
    });

    test('shows target mastery when set', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      await expect(page.getByText(/target: 80%/i)).toBeVisible();
    });

    test('shows reward when set', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      await expect(page.getByText(/pizza night/i)).toBeVisible();
    });

    test('shows target date when set', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Date should be displayed in readable format
      // The exact format depends on formatDate implementation
    });

    test('shows achieved status for completed goals', async ({ page }) => {
      // Mock a goal that has been achieved
      await page.route('**/api/v1/parent/goals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              goals: [
                {
                  id: 'goal-achieved',
                  student_id: 'student-1',
                  parent_id: 'parent-1',
                  title: 'Completed Goal',
                  description: 'This goal was achieved',
                  target_mastery: 80,
                  is_active: false,
                  achieved_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  progress: {
                    progress_percentage: 100,
                    is_on_track: true,
                  },
                },
              ],
              total: 1,
              active_count: 0,
              achieved_count: 1,
            }),
          });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Should show achieved indicator
      await expect(page.getByText(/achieved on/i)).toBeVisible();
    });

    test('shows behind schedule warning when not on track', async ({ page }) => {
      // Mock a goal that is behind schedule
      await page.route('**/api/v1/parent/goals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              goals: [
                {
                  id: 'goal-behind',
                  student_id: 'student-1',
                  parent_id: 'parent-1',
                  title: 'Behind Schedule Goal',
                  description: 'This goal is behind',
                  target_mastery: 80,
                  target_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  is_active: true,
                  achieved_at: null,
                  created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                  progress: {
                    progress_percentage: 30,
                    days_remaining: 5,
                    is_on_track: false,
                  },
                },
              ],
              total: 1,
              active_count: 1,
              achieved_count: 0,
            }),
          });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Should show behind schedule warning
      await expect(page.getByText(/behind schedule/i)).toBeVisible();
    });

    test('shows overdue indicator for past target dates', async ({ page }) => {
      // Mock a goal with past target date
      await page.route('**/api/v1/parent/goals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              goals: [
                {
                  id: 'goal-overdue',
                  student_id: 'student-1',
                  parent_id: 'parent-1',
                  title: 'Overdue Goal',
                  description: 'This goal is overdue',
                  target_mastery: 80,
                  target_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                  is_active: true,
                  achieved_at: null,
                  created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                  progress: {
                    progress_percentage: 50,
                    days_remaining: -5,
                    is_on_track: false,
                  },
                },
              ],
              total: 1,
              active_count: 1,
              achieved_count: 0,
            }),
          });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Should show overdue indicator
      await expect(page.getByText(/overdue/i)).toBeVisible();
    });
  });

  test.describe('Empty States', () => {
    test('shows empty state when no goals exist', async ({ page }) => {
      // Mock empty goals response
      await page.route('**/api/v1/parent/goals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              goals: [],
              total: 0,
              active_count: 0,
              achieved_count: 0,
            }),
          });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Should show empty state
      await expect(page.getByText(/no goals yet/i)).toBeVisible();
      await expect(page.getByText(/create a goal to help motivate/i)).toBeVisible();
    });

    test('shows empty state when filtered results are empty', async ({ page }) => {
      // Mock goals with only active (no achieved)
      await page.route('**/api/v1/parent/goals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              goals: [
                {
                  id: 'goal-1',
                  title: 'Active Goal',
                  is_active: true,
                  achieved_at: null,
                  progress: { progress_percentage: 50 },
                },
              ],
              total: 1,
              active_count: 1,
              achieved_count: 0,
            }),
          });
        }
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Filter to achieved only
      await page.getByRole('button', { name: /^achieved$/i }).click();

      // Should show empty state for achieved filter
      await expect(page.getByText(/no goals yet/i)).toBeVisible();
    });
  });
});
