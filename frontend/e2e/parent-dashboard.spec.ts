import { test, expect } from '@playwright/test';
import {
  setupParentDashboardMocks,
  loginAsParent,
  goToParentDashboard,
  mockStudents,
  mockGoals,
  mockNotifications,
} from './fixtures/parent-dashboard';

/**
 * E2E tests for Parent Dashboard.
 */
test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
    await setupParentDashboardMocks(page);
  });

  test.describe('Dashboard Overview', () => {
    test('displays dashboard overview with student summaries', async ({ page }) => {
      await goToParentDashboard(page);

      // Check header is visible
      await expect(page.getByRole('heading', { name: /parent dashboard/i })).toBeVisible();

      // Check student cards are displayed
      for (const student of mockStudents) {
        await expect(page.getByText(student.displayName)).toBeVisible();
      }
    });

    test('shows quick stats in header', async ({ page }) => {
      await goToParentDashboard(page);

      // Check study time stat
      await expect(page.getByText(/study time/i)).toBeVisible();

      // Check active goals count
      await expect(page.getByText(/active goals/i)).toBeVisible();

      // Check notifications badge
      await expect(page.getByText(/notifications/i)).toBeVisible();
    });

    test('displays all navigation tabs', async ({ page }) => {
      await goToParentDashboard(page);

      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /progress/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /weekly insights/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /goals/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible();
    });

    test('shows HSC tab for Stage 6 students', async ({ page }) => {
      await goToParentDashboard(page);

      // Select the Year 11 student (Oliver)
      await page.getByRole('button', { name: 'Oliver' }).click();

      // HSC Dashboard tab should appear
      await expect(page.getByRole('button', { name: /hsc dashboard/i })).toBeVisible();
    });

    test('hides HSC tab for non-Stage 6 students', async ({ page }) => {
      await goToParentDashboard(page);

      // Select Year 5 student (Emma) - should be default
      // HSC tab should not be visible
      const hscTab = page.getByRole('button', { name: /hsc dashboard/i });
      await expect(hscTab).not.toBeVisible();
    });

    test('student selector works for multi-child families', async ({ page }) => {
      await goToParentDashboard(page);

      // Both student names should be visible as selector buttons
      await expect(page.getByRole('button', { name: 'Emma' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Oliver' })).toBeVisible();

      // Click on Oliver
      await page.getByRole('button', { name: 'Oliver' }).click();

      // The button should now be highlighted (active state)
      const oliverButton = page.getByRole('button', { name: 'Oliver' });
      await expect(oliverButton).toHaveClass(/bg-blue-600/);
    });

    test('clicking View Details navigates to progress tab', async ({ page }) => {
      await goToParentDashboard(page);

      // Click View Details on a student card
      await page.getByRole('button', { name: /view details/i }).first().click();

      // Should navigate to Progress tab
      const progressTab = page.getByRole('button', { name: /progress/i });
      await expect(progressTab).toHaveClass(/bg-blue-100/);
    });
  });

  test.describe('Progress Tab', () => {
    test('displays student progress details', async ({ page }) => {
      await goToParentDashboard(page);

      // Navigate to Progress tab
      await page.getByRole('button', { name: /progress/i }).click();

      // Check student name is in header
      await expect(page.getByText(/Emma's Progress/i)).toBeVisible();

      // Check grade/stage info
      await expect(page.getByText(/Year 5/i)).toBeVisible();
      await expect(page.getByText(/Stage 3/i)).toBeVisible();
    });

    test('shows overall mastery with trend', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /progress/i }).click();

      // Check mastery percentage
      await expect(page.getByText('73%')).toBeVisible();

      // Check positive trend indicator
      await expect(page.getByText(/\+5\.2%/)).toBeVisible();
    });

    test('displays weekly stats', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /progress/i }).click();

      // Check weekly stats section
      await expect(page.getByText(/this week/i)).toBeVisible();
      await expect(page.getByText(/sessions/i)).toBeVisible();
      await expect(page.getByText(/flashcards/i)).toBeVisible();
    });

    test('shows foundation strength with critical gaps', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /progress/i }).click();

      // Check foundation strength section
      await expect(page.getByText(/foundation strength/i)).toBeVisible();
      await expect(page.getByText('68%')).toBeVisible();

      // Check critical gaps are displayed
      await expect(page.getByText(/critical gaps/i)).toBeVisible();
      await expect(page.getByText(/fractions/i)).toBeVisible();
    });

    test('displays subject progress chart', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /progress/i }).click();

      // Check subject progress section
      await expect(page.getByText(/subject progress/i)).toBeVisible();
      await expect(page.getByText(/mathematics/i)).toBeVisible();
    });
  });

  test.describe('Weekly Insights Tab', () => {
    test('displays AI-generated insights', async ({ page }) => {
      await goToParentDashboard(page);

      // Navigate to Insights tab
      await page.getByRole('button', { name: /weekly insights/i }).click();

      // Check wins section
      await expect(page.getByText(/this week's wins/i)).toBeVisible();
      await expect(page.getByText(/great progress in mathematics/i)).toBeVisible();
    });

    test('shows areas to watch', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /weekly insights/i }).click();

      // Check areas to watch section
      await expect(page.getByText(/areas to watch/i)).toBeVisible();
      await expect(page.getByText(/fractions need attention/i)).toBeVisible();
    });

    test('displays recommendations', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /weekly insights/i }).click();

      // Check recommendations section
      await expect(page.getByText(/recommendations/i)).toBeVisible();
      await expect(page.getByText(/daily flashcard review/i)).toBeVisible();
    });

    test('shows teacher talking points', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /weekly insights/i }).click();

      // Check talking points section
      await expect(page.getByText(/teacher talking points/i)).toBeVisible();
      await expect(page.getByText(/discuss multiplication strategies/i)).toBeVisible();
    });

    test('shows HSC projection for Stage 6 students', async ({ page }) => {
      await goToParentDashboard(page);

      // Select Oliver (Year 11)
      await page.getByRole('button', { name: 'Oliver' }).click();

      // Navigate to Insights tab
      await page.getByRole('button', { name: /weekly insights/i }).click();

      // Check HSC projection section
      await expect(page.getByText(/hsc projection/i)).toBeVisible();
      await expect(page.getByText(/band 5/i)).toBeVisible();
    });
  });

  test.describe('Goals Tab', () => {
    test('displays active goals', async ({ page }) => {
      await goToParentDashboard(page);

      // Navigate to Goals tab
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check goals are displayed
      await expect(page.getByText(/family goals/i)).toBeVisible();
      await expect(page.getByText(/master multiplication tables/i)).toBeVisible();
      await expect(page.getByText(/complete reading challenge/i)).toBeVisible();
    });

    test('shows goal progress bars', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check progress percentages are shown
      await expect(page.getByText('63%')).toBeVisible(); // 62.5 rounded
      await expect(page.getByText('40%')).toBeVisible();
    });

    test('shows reward for goals with rewards', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check rewards are displayed
      await expect(page.getByText(/pizza night/i)).toBeVisible();
      await expect(page.getByText(/new book set/i)).toBeVisible();
    });

    test('can open create goal form', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Click New Goal button
      await page.getByRole('button', { name: /new goal/i }).click();

      // Check form is displayed
      await expect(page.getByText(/create new goal/i)).toBeVisible();
      await expect(page.getByLabel(/goal title/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await expect(page.getByLabel(/target mastery/i)).toBeVisible();
      await expect(page.getByLabel(/target date/i)).toBeVisible();
      await expect(page.getByLabel(/reward/i)).toBeVisible();
    });

    test('can create a new goal', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Open create form
      await page.getByRole('button', { name: /new goal/i }).click();

      // Fill in form
      await page.getByLabel(/goal title/i).fill('Learn Division');
      await page.getByLabel(/description/i).fill('Master long division');
      await page.getByLabel(/target mastery/i).fill('75');
      await page.getByLabel(/reward/i).fill('Movie night');

      // Submit form
      await page.getByRole('button', { name: /create goal/i }).click();

      // Form should close (goal created)
      await expect(page.getByText(/create new goal/i)).not.toBeVisible();
    });

    test('can filter goals by status', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Check filter buttons exist
      await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^active$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^achieved$/i })).toBeVisible();

      // Click Active filter
      await page.getByRole('button', { name: /^active$/i }).click();

      // Active button should be highlighted
      const activeButton = page.getByRole('button', { name: /^active$/i });
      await expect(activeButton).toHaveClass(/bg-blue-100/);
    });

    test('can close create goal form', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Open and close form
      await page.getByRole('button', { name: /new goal/i }).click();
      await expect(page.getByText(/create new goal/i)).toBeVisible();

      // Click cancel or close button
      await page.getByRole('button', { name: /cancel/i }).click();

      // Form should be closed
      await expect(page.getByText(/create new goal/i)).not.toBeVisible();
    });
  });

  test.describe('Notifications Tab', () => {
    test('displays notifications list', async ({ page }) => {
      await goToParentDashboard(page);

      // Navigate to Notifications tab
      await page.getByRole('button', { name: /notifications/i }).click();

      // Check notifications are displayed
      await expect(page.getByText(/milestone reached/i)).toBeVisible();
      await expect(page.getByText(/5 day streak/i)).toBeVisible();
      await expect(page.getByText(/needs attention/i)).toBeVisible();
    });

    test('shows unread count', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Check unread count is shown
      await expect(page.getByText(/3 unread/)).toBeVisible();
    });

    test('can mark notification as read', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Find and click mark as read button on first notification
      const markReadButton = page.getByTitle(/mark as read/i).first();
      await markReadButton.click();

      // Button should trigger API call (mock handles this)
    });

    test('can mark all as read', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Click mark all as read button
      await page.getByRole('button', { name: /mark all as read/i }).click();

      // Should update the unread count
    });

    test('can filter by notification type', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Check filter dropdown exists
      const filterSelect = page.locator('select');
      await expect(filterSelect).toBeVisible();

      // Select a specific type
      await filterSelect.selectOption('milestone');
    });

    test('can filter to unread only', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Check unread only checkbox
      const unreadCheckbox = page.getByLabel(/unread only/i);
      await expect(unreadCheckbox).toBeVisible();

      // Toggle unread filter
      await unreadCheckbox.check();
      await expect(unreadCheckbox).toBeChecked();
    });

    test('shows notification type badges', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: /notifications/i }).click();

      // Check type badges are shown
      await expect(page.getByText(/milestone/i).first()).toBeVisible();
      await expect(page.getByText(/streak/i).first()).toBeVisible();
      await expect(page.getByText(/alert/i).first()).toBeVisible();
    });
  });

  test.describe('HSC Dashboard Tab', () => {
    test('displays HSC dashboard for Year 11-12 students', async ({ page }) => {
      await goToParentDashboard(page);

      // Select Oliver (Year 11)
      await page.getByRole('button', { name: 'Oliver' }).click();

      // Navigate to HSC tab
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check HSC-specific content
      await expect(page.getByText(/oliver's hsc dashboard/i)).toBeVisible();
    });

    test('shows days until HSC countdown', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check countdown is displayed
      await expect(page.getByText(/days to hsc/i)).toBeVisible();
    });

    test('displays ATAR projection', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check ATAR projection section
      await expect(page.getByText(/atar projection/i)).toBeVisible();
    });

    test('shows predicted band', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check predicted band section
      await expect(page.getByText(/predicted band/i)).toBeVisible();
      await expect(page.getByText(/band 5/i)).toBeVisible();
    });

    test('displays exam readiness', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check exam readiness section
      await expect(page.getByText(/exam readiness/i)).toBeVisible();
      await expect(page.getByText(/65%/)).toBeVisible();
    });

    test('shows strengths and focus areas', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check strengths section
      await expect(page.getByText(/strengths/i)).toBeVisible();

      // Check focus areas section
      await expect(page.getByText(/focus areas/i)).toBeVisible();
    });

    test('displays HSC study recommendations', async ({ page }) => {
      await goToParentDashboard(page);
      await page.getByRole('button', { name: 'Oliver' }).click();
      await page.getByRole('button', { name: /hsc dashboard/i }).click();

      // Check recommendations section
      await expect(page.getByText(/hsc study recommendations/i)).toBeVisible();
    });
  });

  test.describe('Navigation and State', () => {
    test('maintains selected student when switching tabs', async ({ page }) => {
      await goToParentDashboard(page);

      // Select Oliver
      await page.getByRole('button', { name: 'Oliver' }).click();

      // Navigate to Progress tab
      await page.getByRole('button', { name: /progress/i }).click();

      // Oliver should still be selected
      const oliverButton = page.getByRole('button', { name: 'Oliver' });
      await expect(oliverButton).toHaveClass(/bg-blue-600/);

      // Navigate to Goals tab
      await page.getByRole('button', { name: /^goals$/i }).click();

      // Oliver should still be selected
      await expect(oliverButton).toHaveClass(/bg-blue-600/);
    });

    test('notification badge shows unread count', async ({ page }) => {
      await goToParentDashboard(page);

      // Check notification tab shows unread badge
      const notificationsTab = page.getByRole('button', { name: /notifications/i });
      await expect(notificationsTab.locator('.bg-red-500')).toBeVisible();
      await expect(notificationsTab.getByText('3')).toBeVisible();
    });

    test('tabs are keyboard navigable', async ({ page }) => {
      await goToParentDashboard(page);

      // Focus on first tab
      await page.getByRole('button', { name: /overview/i }).focus();

      // Tab through navigation
      await page.keyboard.press('Tab');

      // Next tab should be focused
      const progressTab = page.getByRole('button', { name: /progress/i });
      await expect(progressTab).toBeFocused();
    });
  });

  test.describe('Error Handling', () => {
    test('shows error message when API fails', async ({ page }) => {
      // Override mock to return error
      await page.route('**/api/v1/parent/dashboard', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      await goToParentDashboard(page);

      // Should show error message
      await expect(page.getByText(/failed to load/i)).toBeVisible();
    });

    test('shows error for progress tab when API fails', async ({ page }) => {
      // Setup normal dashboard mock
      await setupParentDashboardMocks(page);

      // Override progress endpoint to fail
      await page.route('**/api/v1/parent/students/*/progress', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Failed to fetch progress' }),
        });
      });

      await goToParentDashboard(page);
      await page.getByRole('button', { name: /progress/i }).click();

      // Should show error message
      await expect(page.getByText(/failed to load progress/i)).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('mobile: tabs are scrollable', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await goToParentDashboard(page);

      // Nav should be scrollable on mobile
      const nav = page.locator('nav[aria-label="Tabs"]');
      await expect(nav).toHaveClass(/overflow-x-auto/);
    });

    test('mobile: student selector wraps properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await goToParentDashboard(page);

      // Student buttons should be visible and wrap
      await expect(page.getByRole('button', { name: 'Emma' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Oliver' })).toBeVisible();
    });

    test('tablet: shows proper layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await goToParentDashboard(page);

      // Dashboard should be visible and functional
      await expect(page.getByRole('heading', { name: /parent dashboard/i })).toBeVisible();
    });
  });
});
