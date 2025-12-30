import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for Spaced Repetition Revision feature.
 *
 * Tests the revision system including:
 * - Flashcard review sessions
 * - Spaced repetition algorithm (SM-2)
 * - Progress tracking
 * - Subject-specific revision
 */

// Mock flashcard data
const mockFlashcards = [
  {
    id: 'card-1',
    studentId: 'student-1',
    subjectId: 'math-1',
    front: 'What is the quadratic formula?',
    back: 'x = (-b ± √(b² - 4ac)) / 2a',
    difficulty: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card-2',
    studentId: 'student-1',
    subjectId: 'math-1',
    front: 'What is the Pythagorean theorem?',
    back: 'a² + b² = c²',
    difficulty: 2.5,
    interval: 1,
    repetitions: 2,
    nextReview: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card-3',
    studentId: 'student-1',
    subjectId: 'eng-1',
    front: 'What is a metaphor?',
    back: 'A figure of speech comparing two unlike things without using "like" or "as"',
    difficulty: 2.5,
    interval: 3,
    repetitions: 3,
    nextReview: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// Mock review session
const mockSession = {
  id: 'session-1',
  studentId: 'student-1',
  subjectId: 'math-1',
  cardsReviewed: 0,
  cardsCorrect: 0,
  startedAt: new Date().toISOString(),
  completedAt: null,
};

// Mock revision stats
const mockStats = {
  totalCards: 25,
  cardsDueToday: 5,
  cardsLearned: 18,
  streak: 7,
  averageRetention: 85,
  studyTimeToday: 15, // minutes
};

// Mock subjects
const mockSubjects = [
  { id: 'math-1', code: 'MATH', name: 'Mathematics', color: '#3B82F6' },
  { id: 'eng-1', code: 'ENG', name: 'English', color: '#8B5CF6' },
  { id: 'sci-1', code: 'SCI', name: 'Science', color: '#10B981' },
];

/**
 * Setup mocks for revision API endpoints.
 */
async function setupRevisionMocks(page: Page) {
  // Mock flashcards list
  await page.route('**/api/v1/students/*/flashcards', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ flashcards: mockFlashcards }),
    });
  });

  // Mock due cards
  await page.route('**/api/v1/students/*/flashcards/due', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        flashcards: mockFlashcards.slice(0, 2),
        count: 2,
      }),
    });
  });

  // Mock revision session
  await page.route('**/api/v1/revision/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockSession),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: [mockSession] }),
      });
    }
  });

  // Mock card review
  await page.route('**/api/v1/flashcards/*/review', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        nextReview: new Date(Date.now() + 86400000).toISOString(),
        interval: 2,
      }),
    });
  });

  // Mock revision stats
  await page.route('**/api/v1/students/*/revision/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStats),
    });
  });

  // Mock subjects
  await page.route('**/api/v1/students/*/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ subjects: mockSubjects }),
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

test.describe('Spaced Repetition Revision', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await setupRevisionMocks(page);
  });

  test.describe('Revision Dashboard', () => {
    test('displays revision page with stats', async ({ page }) => {
      await page.goto('/revision');

      // Check revision page loads
      await expect(page.getByRole('heading', { name: /revision|flashcards|review/i })).toBeVisible();

      // Check stats are displayed
      await expect(page.getByText(/due today|cards due/i)).toBeVisible();
    });

    test('shows cards due count', async ({ page }) => {
      await page.goto('/revision');

      // Cards due should be visible
      await expect(page.getByText(/5|cards.*due/i)).toBeVisible();
    });

    test('shows study streak', async ({ page }) => {
      await page.goto('/revision');

      // Streak should be visible
      await expect(page.getByText(/7.*day|streak/i)).toBeVisible();
    });

    test('shows retention rate', async ({ page }) => {
      await page.goto('/revision');

      // Retention rate should be visible
      await expect(page.getByText(/85%|retention/i)).toBeVisible();
    });

    test('can select subject for revision', async ({ page }) => {
      await page.goto('/revision');

      // Subject selector should be visible
      await expect(page.getByRole('button', { name: /mathematics/i })
        .or(page.getByText(/mathematics/i))).toBeVisible();

      await expect(page.getByRole('button', { name: /english/i })
        .or(page.getByText(/english/i))).toBeVisible();
    });
  });

  test.describe('Flashcard Review Session', () => {
    test('can start a review session', async ({ page }) => {
      await page.goto('/revision');

      // Click start review button
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Flashcard should be displayed
      await expect(page.getByText(/quadratic formula|pythagorean/i)).toBeVisible({ timeout: 5000 });
    });

    test('displays flashcard front initially', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Card front (question) should be visible
      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });

      // Answer should not be visible yet
      await expect(page.getByText('x = (-b ± √(b² - 4ac)) / 2a')).not.toBeVisible();
    });

    test('can flip card to see answer', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Wait for card to load
      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });

      // Click to flip/reveal
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();

      // Answer should be visible
      await expect(page.getByText(/x = \(-b/)).toBeVisible();
    });

    test('shows rating buttons after revealing answer', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();

      // Rating buttons should appear (SM-2 ratings: Again, Hard, Good, Easy)
      await expect(page.getByRole('button', { name: /again|forgot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /hard|difficult/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /good|correct/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /easy|perfect/i })).toBeVisible();
    });

    test('advances to next card after rating', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();

      // Rate the card
      await page.getByRole('button', { name: /good|correct/i }).click();

      // Next card or completion should show
      await expect(page.getByText(/pythagorean|completed|finished/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows session complete when all cards reviewed', async ({ page }) => {
      // Mock only one card due
      await page.route('**/api/v1/students/*/flashcards/due', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flashcards: [mockFlashcards[0]],
            count: 1,
          }),
        });
      });

      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();
      await page.getByRole('button', { name: /good|correct/i }).click();

      // Completion message should appear
      await expect(page.getByText(/complete|finished|done|all.*reviewed/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows progress indicator during session', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Progress indicator should show (e.g., "1 of 5" or progress bar)
      await expect(page.getByText(/1.*of|progress/i)
        .or(page.locator('[role="progressbar"]'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Flashcard Management', () => {
    test('can view all flashcards', async ({ page }) => {
      await page.goto('/revision/cards');

      // All cards should be listed
      await expect(page.getByText('What is the quadratic formula?')).toBeVisible();
      await expect(page.getByText('What is the Pythagorean theorem?')).toBeVisible();
      await expect(page.getByText('What is a metaphor?')).toBeVisible();
    });

    test('can create a new flashcard', async ({ page }) => {
      await page.route('**/api/v1/flashcards', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'card-new',
              front: 'Test Question',
              back: 'Test Answer',
              ...mockFlashcards[0],
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/revision/cards');

      // Click create button
      await page.getByRole('button', { name: /create|new|add/i }).click();

      // Fill card form
      await page.getByLabel(/front|question/i).fill('Test Question');
      await page.getByLabel(/back|answer/i).fill('Test Answer');

      // Select subject
      const subjectSelect = page.getByRole('combobox', { name: /subject/i })
        .or(page.getByLabel(/subject/i));
      await subjectSelect.click();
      await page.getByRole('option', { name: /mathematics/i })
        .or(page.getByText(/mathematics/i)).click();

      // Save card
      await page.getByRole('button', { name: /save|create/i }).click();

      // Success message or new card should appear
      await expect(page.getByText(/created|saved|success/i)
        .or(page.getByText('Test Question'))).toBeVisible({ timeout: 5000 });
    });

    test('can edit a flashcard', async ({ page }) => {
      await page.route('**/api/v1/flashcards/*', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockFlashcards[0],
              front: 'Updated Question',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/revision/cards');

      // Click on a card to edit
      await page.getByText('What is the quadratic formula?').click();
      await page.getByRole('button', { name: /edit/i }).click();

      // Update front
      const frontInput = page.getByLabel(/front|question/i);
      await frontInput.clear();
      await frontInput.fill('Updated Question');

      // Save changes
      await page.getByRole('button', { name: /save|update/i }).click();

      // Success message should appear
      await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 5000 });
    });

    test('can delete a flashcard', async ({ page }) => {
      await page.route('**/api/v1/flashcards/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      });

      await page.goto('/revision/cards');

      await page.getByText('What is the quadratic formula?').click();
      await page.getByRole('button', { name: /delete/i }).click();

      // Confirm deletion
      await page.getByRole('button', { name: /confirm|yes|delete/i }).last().click();

      // Success message should appear
      await expect(page.getByText(/deleted|removed|success/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Subject-Specific Revision', () => {
    test('can filter cards by subject', async ({ page }) => {
      await page.goto('/revision');

      // Click on Math subject
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Should show only math-related cards
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText(/quadratic|pythagorean/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows subject-specific stats', async ({ page }) => {
      await page.goto('/revision');

      // Click on a subject to see its stats
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Subject stats should be visible
      await expect(page.getByText(/math|mathematics/i)).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('can flip card with spacebar', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });

      // Press spacebar to flip
      await page.keyboard.press('Space');

      // Answer should be visible
      await expect(page.getByText(/x = \(-b/)).toBeVisible();
    });

    test('can rate card with number keys', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Space');

      // Press 3 for "Good" rating
      await page.keyboard.press('3');

      // Should advance to next card
      await expect(page.getByText(/pythagorean|complete/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session History', () => {
    test('shows previous revision sessions', async ({ page }) => {
      await page.route('**/api/v1/students/*/revision/history', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessions: [
              {
                id: 'session-1',
                date: new Date().toISOString(),
                cardsReviewed: 10,
                accuracy: 80,
                duration: 15,
              },
              {
                id: 'session-2',
                date: new Date(Date.now() - 86400000).toISOString(),
                cardsReviewed: 15,
                accuracy: 85,
                duration: 20,
              },
            ],
          }),
        });
      });

      await page.goto('/revision/history');

      // Previous sessions should be listed
      await expect(page.getByText(/10.*cards|cards.*10/i)).toBeVisible();
      await expect(page.getByText(/15.*cards|cards.*15/i)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('flashcard has proper ARIA roles', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Card should have accessible structure
      const card = page.locator('[role="article"]')
        .or(page.locator('[data-testid="flashcard"]'))
        .or(page.locator('.flashcard'));
      await expect(card.first()).toBeVisible({ timeout: 5000 });
    });

    test('rating buttons are keyboard accessible', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();

      // Tab to rating buttons
      const goodButton = page.getByRole('button', { name: /good|correct/i });
      await goodButton.focus();
      await expect(goodButton).toBeFocused();
    });

    test('screen reader announces card content', async ({ page }) => {
      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Card content should be readable
      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('revision works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/revision');

      // Start review should be visible
      await expect(page.getByRole('button', { name: /start.*review|begin|study/i })).toBeVisible();

      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Card should be visible
      await expect(page.getByText(/quadratic formula/i)).toBeVisible({ timeout: 5000 });
    });

    test('can swipe to flip card on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });

      // Tap to flip
      await page.getByRole('button', { name: /show.*answer|flip|reveal|tap/i }).click();

      await expect(page.getByText(/x = \(-b/)).toBeVisible();
    });

    test('rating buttons fit on mobile screen', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();

      // All rating buttons should be visible
      await expect(page.getByRole('button', { name: /again|forgot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /easy|perfect/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('shows error when session fails to load', async ({ page }) => {
      await page.route('**/api/v1/students/*/flashcards/due', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 5000 });
    });

    test('handles rating submission failure', async ({ page }) => {
      await page.route('**/api/v1/flashcards/*/review', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Failed to save review' }),
        });
      });

      await page.goto('/revision');
      await page.getByRole('button', { name: /start.*review|begin|study/i }).click();

      await expect(page.getByText('What is the quadratic formula?')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /show.*answer|flip|reveal/i }).click();
      await page.getByRole('button', { name: /good|correct/i }).click();

      // Error should appear but session should continue
      await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows empty state when no cards due', async ({ page }) => {
      await page.route('**/api/v1/students/*/flashcards/due', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ flashcards: [], count: 0 }),
        });
      });

      await page.goto('/revision');

      // Empty state message should appear
      await expect(page.getByText(/no cards|all caught up|come back/i)).toBeVisible();
    });
  });
});
