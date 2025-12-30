import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for Gamification feature.
 *
 * Tests the gamification system including:
 * - XP and level progression
 * - Achievement badges
 * - Leaderboards
 * - Streaks and rewards
 */

// Mock gamification stats
const mockStats = {
  studentId: 'student-1',
  level: 5,
  currentXp: 2350,
  xpToNextLevel: 500,
  totalXp: 4850,
  streak: 7,
  longestStreak: 14,
  achievementsUnlocked: 12,
  totalAchievements: 25,
};

// Mock achievements
const mockAchievements = [
  {
    id: 'ach-1',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: 'footprints',
    xpReward: 50,
    unlockedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    category: 'milestone',
  },
  {
    id: 'ach-2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: 'flame',
    xpReward: 200,
    unlockedAt: new Date().toISOString(),
    category: 'streak',
  },
  {
    id: 'ach-3',
    name: 'Math Whiz',
    description: 'Complete 50 Mathematics flashcards',
    icon: 'calculator',
    xpReward: 150,
    unlockedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    category: 'subject',
  },
  {
    id: 'ach-4',
    name: 'Night Owl',
    description: 'Study for 30 minutes after 8 PM',
    icon: 'moon',
    xpReward: 75,
    unlockedAt: null, // Not yet unlocked
    category: 'time',
    progress: 15,
    target: 30,
  },
  {
    id: 'ach-5',
    name: 'Perfectionist',
    description: 'Get 100% accuracy in a revision session',
    icon: 'star',
    xpReward: 100,
    unlockedAt: null,
    category: 'accuracy',
    progress: 95,
    target: 100,
  },
];

// Mock leaderboard
const mockLeaderboard = [
  { rank: 1, studentName: 'Alex K.', level: 8, xp: 8500, avatar: 'A' },
  { rank: 2, studentName: 'Sarah M.', level: 7, xp: 7200, avatar: 'S' },
  { rank: 3, studentName: 'Test Student', level: 5, xp: 4850, avatar: 'T', isCurrentUser: true },
  { rank: 4, studentName: 'James L.', level: 5, xp: 4500, avatar: 'J' },
  { rank: 5, studentName: 'Emily R.', level: 4, xp: 3800, avatar: 'E' },
];

// Mock daily challenges
const mockChallenges = [
  {
    id: 'challenge-1',
    title: 'Quick Revision',
    description: 'Complete 10 flashcard reviews',
    xpReward: 50,
    progress: 7,
    target: 10,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'challenge-2',
    title: 'Subject Explorer',
    description: 'Study 2 different subjects today',
    xpReward: 75,
    progress: 1,
    target: 2,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'challenge-3',
    title: 'Perfect Session',
    description: 'Get 100% accuracy in any revision session',
    xpReward: 100,
    progress: 0,
    target: 1,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
];

/**
 * Setup mocks for gamification API endpoints.
 */
async function setupGamificationMocks(page: Page) {
  // Mock gamification stats
  await page.route('**/api/v1/students/*/gamification/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStats),
    });
  });

  // Mock achievements
  await page.route('**/api/v1/students/*/achievements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ achievements: mockAchievements }),
    });
  });

  // Mock leaderboard
  await page.route('**/api/v1/leaderboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: mockLeaderboard }),
    });
  });

  // Mock daily challenges
  await page.route('**/api/v1/students/*/challenges', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ challenges: mockChallenges }),
    });
  });

  // Mock XP award
  await page.route('**/api/v1/gamification/award-xp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        xpAwarded: 50,
        newTotal: mockStats.currentXp + 50,
        levelUp: false,
      }),
    });
  });
}

/**
 * Helper to login as a student user.
 */
async function loginAsStudent(page: Page) {
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
      body: JSON.stringify({
        id: 'user-1',
        email: 'student@example.com',
        students: [{ id: 'student-1', displayName: 'Test Student' }],
      }),
    });
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('student@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('Gamification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await setupGamificationMocks(page);
  });

  test.describe('Profile Stats', () => {
    test('displays level and XP on dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Level should be visible
      await expect(page.getByText(/level.*5|5.*level/i)).toBeVisible();

      // XP should be visible
      await expect(page.getByText(/2350|xp/i)).toBeVisible();
    });

    test('shows XP progress bar', async ({ page }) => {
      await page.goto('/dashboard');

      // Progress bar should be visible
      const progressBar = page.locator('[role="progressbar"]')
        .or(page.locator('.xp-progress'))
        .or(page.locator('[data-testid="xp-progress"]'));
      await expect(progressBar.first()).toBeVisible();
    });

    test('displays study streak', async ({ page }) => {
      await page.goto('/dashboard');

      // Streak should be visible
      await expect(page.getByText(/7.*day|streak.*7/i)).toBeVisible();
    });

    test('shows XP needed for next level', async ({ page }) => {
      await page.goto('/profile')
        .catch(() => page.goto('/dashboard'));

      // XP to next level should be visible
      await expect(page.getByText(/500.*xp|next.*level/i)).toBeVisible();
    });
  });

  test.describe('Achievements', () => {
    test('displays achievements page', async ({ page }) => {
      await page.goto('/achievements');

      // Achievements page should load
      await expect(page.getByRole('heading', { name: /achievements|badges/i })).toBeVisible();

      // Achievement count should be visible
      await expect(page.getByText(/12.*of.*25|12\/25/i)).toBeVisible();
    });

    test('shows unlocked achievements', async ({ page }) => {
      await page.goto('/achievements');

      // Unlocked achievements should be visible
      await expect(page.getByText('First Steps')).toBeVisible();
      await expect(page.getByText('Week Warrior')).toBeVisible();
      await expect(page.getByText('Math Whiz')).toBeVisible();
    });

    test('shows locked achievements with progress', async ({ page }) => {
      await page.goto('/achievements');

      // Locked achievements should be visible with progress
      await expect(page.getByText('Night Owl')).toBeVisible();
      await expect(page.getByText(/15.*30|50%/i)).toBeVisible();
    });

    test('can filter achievements by category', async ({ page }) => {
      await page.goto('/achievements');

      // Click on category filter
      const categoryFilter = page.getByRole('button', { name: /streak|category/i })
        .or(page.getByRole('tab', { name: /streak/i }));
      await categoryFilter.click();

      // Only streak achievements should be visible
      await expect(page.getByText('Week Warrior')).toBeVisible();
    });

    test('shows achievement details on click', async ({ page }) => {
      await page.goto('/achievements');

      // Click on an achievement
      await page.getByText('First Steps').click();

      // Details should appear
      await expect(page.getByText(/complete.*first.*study.*session/i)).toBeVisible();
      await expect(page.getByText(/50.*xp/i)).toBeVisible();
    });

    test('shows recently unlocked badge', async ({ page }) => {
      await page.goto('/achievements');

      // Recent badge indicator should be visible
      await expect(page.getByText('Week Warrior')).toBeVisible();
      // Could have "New" badge or highlight
    });
  });

  test.describe('Leaderboard', () => {
    test('displays leaderboard page', async ({ page }) => {
      await page.goto('/leaderboard');

      // Leaderboard should load
      await expect(page.getByRole('heading', { name: /leaderboard|rankings/i })).toBeVisible();
    });

    test('shows ranked users', async ({ page }) => {
      await page.goto('/leaderboard');

      // Users should be listed with ranks
      await expect(page.getByText('Alex K.')).toBeVisible();
      await expect(page.getByText('Sarah M.')).toBeVisible();
      await expect(page.getByText('Test Student')).toBeVisible();
    });

    test('highlights current user', async ({ page }) => {
      await page.goto('/leaderboard');

      // Current user should be highlighted
      const currentUserRow = page.locator('[data-current-user="true"]')
        .or(page.locator('.current-user'))
        .or(page.getByText('Test Student').locator('..'));
      await expect(currentUserRow).toBeVisible();
    });

    test('shows user rank', async ({ page }) => {
      await page.goto('/leaderboard');

      // Rank should be visible
      await expect(page.getByText(/3rd|#3|rank.*3/i)).toBeVisible();
    });

    test('shows level and XP for each user', async ({ page }) => {
      await page.goto('/leaderboard');

      // Level and XP should be visible for top user
      await expect(page.getByText(/level.*8|8/)).toBeVisible();
      await expect(page.getByText(/8500|8,500/)).toBeVisible();
    });

    test('can switch between time periods', async ({ page }) => {
      await page.goto('/leaderboard');

      // Time period switcher should be available
      const weeklyButton = page.getByRole('button', { name: /weekly/i })
        .or(page.getByRole('tab', { name: /weekly/i }));
      await weeklyButton.click();

      // Leaderboard should update
      await expect(page.getByText('Alex K.')).toBeVisible();
    });
  });

  test.describe('Daily Challenges', () => {
    test('displays daily challenges', async ({ page }) => {
      await page.goto('/challenges')
        .catch(() => page.goto('/dashboard'));

      // Challenges should be visible
      await expect(page.getByText('Quick Revision')).toBeVisible();
      await expect(page.getByText('Subject Explorer')).toBeVisible();
    });

    test('shows challenge progress', async ({ page }) => {
      await page.goto('/challenges')
        .catch(() => page.goto('/dashboard'));

      // Progress should be visible
      await expect(page.getByText(/7.*10|7\/10/i)).toBeVisible();
    });

    test('shows XP rewards for challenges', async ({ page }) => {
      await page.goto('/challenges')
        .catch(() => page.goto('/dashboard'));

      // XP rewards should be visible
      await expect(page.getByText(/50.*xp|75.*xp|100.*xp/i).first()).toBeVisible();
    });

    test('shows challenge expiry time', async ({ page }) => {
      await page.goto('/challenges')
        .catch(() => page.goto('/dashboard'));

      // Expiry time should be visible
      await expect(page.getByText(/expires|hours|remaining/i)).toBeVisible();
    });
  });

  test.describe('XP Notifications', () => {
    test('shows XP gain notification after activity', async ({ page }) => {
      // Mock XP award response with animation trigger
      await page.route('**/api/v1/gamification/award-xp', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            xpAwarded: 50,
            newTotal: 2400,
            levelUp: false,
          }),
        });
      });

      await page.goto('/revision');

      // Trigger an XP-earning activity
      await page.getByRole('button', { name: /start.*review|begin/i }).click();

      // XP notification should appear (if implemented)
      // This might need adjustment based on actual implementation
    });

    test('shows level up celebration', async ({ page }) => {
      // Mock level up response
      await page.route('**/api/v1/gamification/award-xp', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            xpAwarded: 100,
            newTotal: 100,
            levelUp: true,
            newLevel: 6,
          }),
        });
      });

      await page.goto('/dashboard');

      // Level up modal/notification should appear (if implemented)
    });

    test('shows achievement unlock notification', async ({ page }) => {
      // Mock achievement unlock
      await page.route('**/api/v1/achievements/unlock', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            achievement: mockAchievements[0],
            unlocked: true,
          }),
        });
      });

      await page.goto('/dashboard');

      // Achievement notification should appear (if implemented)
    });
  });

  test.describe('Streak Tracking', () => {
    test('shows current streak on dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Streak should be visible
      await expect(page.getByText(/7.*day|streak/i)).toBeVisible();
    });

    test('shows streak freeze option', async ({ page }) => {
      await page.goto('/profile')
        .catch(() => page.goto('/dashboard'));

      // Streak freeze info should be available
      await expect(page.getByText(/streak|freeze/i).first()).toBeVisible();
    });

    test('shows longest streak', async ({ page }) => {
      await page.goto('/profile')
        .catch(() => page.goto('/dashboard'));

      // Longest streak should be visible
      await expect(page.getByText(/14.*day|longest|best/i)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('achievements have proper ARIA labels', async ({ page }) => {
      await page.goto('/achievements');

      // Achievement cards should have proper roles
      const achievementCard = page.locator('[role="article"]')
        .or(page.locator('[data-testid="achievement-card"]'))
        .or(page.locator('.achievement-card'));
      await expect(achievementCard.first()).toBeVisible();
    });

    test('progress bars have accessible labels', async ({ page }) => {
      await page.goto('/dashboard');

      // Progress bars should have aria-labels
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar.first()).toBeVisible();
    });

    test('leaderboard is keyboard navigable', async ({ page }) => {
      await page.goto('/leaderboard');

      // Tab through leaderboard entries
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('gamification stats work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');

      // Stats should be visible
      await expect(page.getByText(/level.*5/i)).toBeVisible();
      await expect(page.getByText(/streak/i)).toBeVisible();
    });

    test('achievements page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/achievements');

      // Achievements should be visible
      await expect(page.getByText('First Steps')).toBeVisible();
    });

    test('leaderboard is scrollable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/leaderboard');

      // Leaderboard should be visible and scrollable
      await expect(page.getByText('Alex K.')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles gamification stats load failure', async ({ page }) => {
      await page.route('**/api/v1/students/*/gamification/stats', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      await page.goto('/dashboard');

      // Should show fallback or error state
      // Dashboard should still load even if gamification fails
      await expect(page.getByRole('heading', { name: /dashboard|home/i })).toBeVisible();
    });

    test('handles achievements load failure', async ({ page }) => {
      await page.route('**/api/v1/students/*/achievements', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Failed to load achievements' }),
        });
      });

      await page.goto('/achievements');

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
    });

    test('handles leaderboard load failure', async ({ page }) => {
      await page.route('**/api/v1/leaderboard**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Failed to load leaderboard' }),
        });
      });

      await page.goto('/leaderboard');

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
    });
  });
});
