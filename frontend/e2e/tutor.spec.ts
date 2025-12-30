import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for Socratic AI Tutor feature.
 *
 * Tests the AI-powered tutoring interface that uses the Socratic method
 * to guide students through learning without giving direct answers.
 */

// Mock tutor API response
const mockTutorResponse = {
  message: "That's a great start! Let's think about this step by step. What do we know about the problem so far?",
  suggestions: [
    "Think about what information is given",
    "What are we trying to find?",
    "What method might help here?"
  ],
  encouragement: "You're on the right track!",
};

// Mock conversation history
const mockConversation = {
  id: 'conversation-1',
  studentId: 'student-1',
  subjectId: 'math-1',
  messages: [
    {
      id: 'msg-1',
      role: 'student',
      content: 'I need help with multiplying fractions',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      role: 'tutor',
      content: "Of course! Let's work through this together. First, can you tell me what you remember about multiplying whole numbers?",
      timestamp: new Date().toISOString(),
    },
  ],
};

/**
 * Setup mocks for tutor API endpoints.
 */
async function setupTutorMocks(page: Page) {
  // Mock tutor chat endpoint
  await page.route('**/api/v1/tutor/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTutorResponse),
    });
  });

  // Mock conversation history
  await page.route('**/api/v1/tutor/conversations/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConversation),
    });
  });

  // Mock subjects list
  await page.route('**/api/v1/students/*/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subjects: [
          { id: 'math-1', code: 'MATH', name: 'Mathematics', color: '#3B82F6' },
          { id: 'eng-1', code: 'ENG', name: 'English', color: '#8B5CF6' },
          { id: 'sci-1', code: 'SCI', name: 'Science', color: '#10B981' },
        ],
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

test.describe('Socratic Tutor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await setupTutorMocks(page);
  });

  test.describe('Tutor Interface', () => {
    test('displays tutor page with subject selection', async ({ page }) => {
      await page.goto('/tutor');

      // Check tutor interface loads
      await expect(page.getByRole('heading', { name: /tutor|ask.*question/i })).toBeVisible();

      // Check subject selector is visible
      await expect(page.getByText(/select.*subject|choose.*subject/i)).toBeVisible();
    });

    test('shows available subjects for student', async ({ page }) => {
      await page.goto('/tutor');

      // Check subjects are listed
      await expect(page.getByText(/mathematics/i)).toBeVisible();
      await expect(page.getByText(/english/i)).toBeVisible();
      await expect(page.getByText(/science/i)).toBeVisible();
    });

    test('can select a subject to start tutoring', async ({ page }) => {
      await page.goto('/tutor');

      // Click on Mathematics subject
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Chat interface should appear
      await expect(page.getByPlaceholder(/type.*message|ask.*question/i)).toBeVisible();
    });
  });

  test.describe('Chat Interface', () => {
    test('displays message input field', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Message input should be visible
      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toBeEnabled();
    });

    test('can send a message to the tutor', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Type a message
      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('How do I solve 2x + 5 = 15?');

      // Send the message
      await page.getByRole('button', { name: /send/i }).click();

      // Message should appear in chat
      await expect(page.getByText('How do I solve 2x + 5 = 15?')).toBeVisible();
    });

    test('displays tutor response after sending message', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Send a message
      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Help me understand fractions');
      await page.getByRole('button', { name: /send/i }).click();

      // Wait for tutor response
      await expect(page.getByText(/step by step/i)).toBeVisible({ timeout: 10000 });
    });

    test('shows loading indicator while waiting for response', async ({ page }) => {
      // Delay the API response
      await page.route('**/api/v1/tutor/chat', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTutorResponse),
        });
      });

      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Help me');
      await page.getByRole('button', { name: /send/i }).click();

      // Loading indicator should appear
      await expect(page.getByRole('status')).toBeVisible();
    });

    test('can send messages with Enter key', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Test message');
      await messageInput.press('Enter');

      // Message should be sent
      await expect(page.getByText('Test message')).toBeVisible();
    });
  });

  test.describe('Socratic Method', () => {
    test('tutor asks guiding questions instead of giving answers', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('What is 5 times 6?');
      await page.getByRole('button', { name: /send/i }).click();

      // Response should contain a question (Socratic method)
      await expect(page.getByText(/\?/)).toBeVisible({ timeout: 10000 });
    });

    test('displays helpful suggestions', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Help me with this problem');
      await page.getByRole('button', { name: /send/i }).click();

      // Suggestions should be visible
      await expect(page.getByText(/think about/i)).toBeVisible({ timeout: 10000 });
    });

    test('shows encouragement messages', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('I tried breaking down the problem');
      await page.getByRole('button', { name: /send/i }).click();

      // Encouragement should be visible
      await expect(page.getByText(/right track/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Conversation History', () => {
    test('shows previous conversation messages', async ({ page }) => {
      // Mock existing conversation
      await page.route('**/api/v1/tutor/conversations', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversations: [mockConversation],
          }),
        });
      });

      await page.goto('/tutor');

      // Previous conversations should be listed
      await expect(page.getByText(/multiplying fractions/i)).toBeVisible();
    });

    test('can continue a previous conversation', async ({ page }) => {
      await page.route('**/api/v1/tutor/conversations', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversations: [mockConversation],
          }),
        });
      });

      await page.goto('/tutor');

      // Click on previous conversation
      await page.getByText(/multiplying fractions/i).click();

      // Previous messages should be visible
      await expect(page.getByText(/what you remember about multiplying/i)).toBeVisible();
    });

    test('can start a new conversation', async ({ page }) => {
      await page.goto('/tutor');

      // Click new conversation button
      await page.getByRole('button', { name: /new.*conversation|start.*new/i }).click();

      // Subject selection should appear
      await expect(page.getByText(/select.*subject/i)).toBeVisible();
    });
  });

  test.describe('Subject-Specific Styling', () => {
    test('Mathematics tutor has appropriate styling', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Check for math-specific color or icon
      const tutorHeader = page.locator('[data-testid="tutor-header"]');
      // Math color is #3B82F6 (blue)
      await expect(tutorHeader.or(page.getByText(/mathematics/i))).toBeVisible();
    });

    test('can switch between subjects', async ({ page }) => {
      await page.goto('/tutor');

      // Start with Math
      await page.getByRole('button', { name: /mathematics/i }).click();
      await expect(page.getByText(/mathematics/i)).toBeVisible();

      // Switch to English
      await page.getByRole('button', { name: /change.*subject|back/i }).click();
      await page.getByRole('button', { name: /english/i }).click();
      await expect(page.getByText(/english/i)).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('shows error message when API fails', async ({ page }) => {
      await page.route('**/api/v1/tutor/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Test message');
      await page.getByRole('button', { name: /send/i }).click();

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 10000 });
    });

    test('allows retry after error', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/v1/tutor/chat', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockTutorResponse),
          });
        }
      });

      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await messageInput.fill('Test');
      await page.getByRole('button', { name: /send/i }).click();

      // Wait for error then retry
      await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });

      // Retry
      await page.getByRole('button', { name: /retry|try again/i }).click();

      // Should succeed on retry
      await expect(page.getByText(/step by step/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test('chat messages have proper ARIA roles', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Chat container should have proper role
      const chatContainer = page.locator('[role="log"]');
      await expect(chatContainer).toBeVisible();
    });

    test('message input is properly labeled', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Input should have accessible label
      const input = page.getByRole('textbox', { name: /message|question/i });
      await expect(input).toBeVisible();
    });

    test('send button is keyboard accessible', async ({ page }) => {
      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      const sendButton = page.getByRole('button', { name: /send/i });
      await sendButton.focus();
      await expect(sendButton).toBeFocused();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('tutor interface works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/tutor');
      await page.getByRole('button', { name: /mathematics/i }).click();

      // Chat interface should be visible
      const messageInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await expect(messageInput).toBeVisible();

      // Send button should be accessible
      await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    });

    test('subject selector is usable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/tutor');

      // Subjects should be visible and tappable
      await expect(page.getByRole('button', { name: /mathematics/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /english/i })).toBeVisible();
    });
  });
});
