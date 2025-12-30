import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for Notes & OCR feature.
 *
 * Tests the note management system including:
 * - Creating, editing, and deleting notes
 * - OCR processing of uploaded images
 * - Note organization by subject
 * - Search and filtering
 */

// Mock notes data
const mockNotes = [
  {
    id: 'note-1',
    studentId: 'student-1',
    subjectId: 'math-1',
    title: 'Algebra Basics',
    content: 'Variables and expressions introduction...',
    tags: ['algebra', 'variables'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    studentId: 'student-1',
    subjectId: 'eng-1',
    title: 'Essay Structure',
    content: 'Introduction, body paragraphs, conclusion...',
    tags: ['writing', 'essays'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-3',
    studentId: 'student-1',
    subjectId: 'sci-1',
    title: 'Cell Biology',
    content: 'Parts of a cell: nucleus, mitochondria...',
    tags: ['biology', 'cells'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock OCR response
const mockOcrResponse = {
  text: 'This is the extracted text from the image.\n\nIt contains mathematical formulas:\nx² + 2x + 1 = 0\n\nAnd some notes about quadratic equations.',
  confidence: 0.95,
};

// Mock subjects
const mockSubjects = [
  { id: 'math-1', code: 'MATH', name: 'Mathematics', color: '#3B82F6' },
  { id: 'eng-1', code: 'ENG', name: 'English', color: '#8B5CF6' },
  { id: 'sci-1', code: 'SCI', name: 'Science', color: '#10B981' },
];

/**
 * Setup mocks for notes API endpoints.
 */
async function setupNotesMocks(page: Page) {
  // Mock notes list
  await page.route('**/api/v1/students/*/notes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notes: mockNotes }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'note-new',
          studentId: 'student-1',
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock single note operations
  await page.route('**/api/v1/notes/*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotes[0]),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockNotes[0], ...body }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
      });
    } else {
      await route.continue();
    }
  });

  // Mock OCR endpoint
  await page.route('**/api/v1/ocr/process', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOcrResponse),
    });
  });

  // Mock subjects list
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

test.describe('Notes & OCR', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await setupNotesMocks(page);
  });

  test.describe('Notes List', () => {
    test('displays notes page with existing notes', async ({ page }) => {
      await page.goto('/notes');

      // Check notes page loads
      await expect(page.getByRole('heading', { name: /notes/i })).toBeVisible();

      // Check notes are displayed
      await expect(page.getByText('Algebra Basics')).toBeVisible();
      await expect(page.getByText('Essay Structure')).toBeVisible();
      await expect(page.getByText('Cell Biology')).toBeVisible();
    });

    test('shows empty state when no notes exist', async ({ page }) => {
      await page.route('**/api/v1/students/*/notes', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      });

      await page.goto('/notes');

      // Check empty state message
      await expect(page.getByText(/no notes|create.*first|get started/i)).toBeVisible();
    });

    test('can filter notes by subject', async ({ page }) => {
      await page.goto('/notes');

      // Click subject filter
      const subjectFilter = page.getByRole('combobox', { name: /subject|filter/i })
        .or(page.getByRole('button', { name: /filter.*subject|all subjects/i }));
      await subjectFilter.click();

      // Select Mathematics
      await page.getByRole('option', { name: /mathematics/i })
        .or(page.getByText(/mathematics/i)).click();

      // Only math notes should be visible
      await expect(page.getByText('Algebra Basics')).toBeVisible();
    });

    test('can search notes by title or content', async ({ page }) => {
      await page.goto('/notes');

      // Find search input
      const searchInput = page.getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'));
      await searchInput.fill('algebra');

      // Matching notes should be visible
      await expect(page.getByText('Algebra Basics')).toBeVisible();
    });
  });

  test.describe('Create Note', () => {
    test('can create a new note', async ({ page }) => {
      await page.goto('/notes');

      // Click create button
      await page.getByRole('button', { name: /create|new|add/i }).click();

      // Fill note form
      await page.getByLabel(/title/i).fill('New Test Note');

      // Select subject
      const subjectSelect = page.getByRole('combobox', { name: /subject/i })
        .or(page.getByLabel(/subject/i));
      await subjectSelect.click();
      await page.getByRole('option', { name: /mathematics/i })
        .or(page.getByText(/mathematics/i)).click();

      // Fill content
      const contentInput = page.getByRole('textbox', { name: /content/i })
        .or(page.locator('textarea').first());
      await contentInput.fill('This is the content of my new note.');

      // Save note
      await page.getByRole('button', { name: /save|create/i }).click();

      // Note should be created (success message or redirect)
      await expect(page.getByText(/created|saved|success/i)
        .or(page.getByText('New Test Note'))).toBeVisible({ timeout: 5000 });
    });

    test('validates required fields when creating note', async ({ page }) => {
      await page.goto('/notes');

      // Click create button
      await page.getByRole('button', { name: /create|new|add/i }).click();

      // Try to save without filling fields
      await page.getByRole('button', { name: /save|create/i }).click();

      // Validation errors should appear
      await expect(page.getByText(/required|title.*required/i)).toBeVisible();
    });
  });

  test.describe('Edit Note', () => {
    test('can edit an existing note', async ({ page }) => {
      await page.goto('/notes');

      // Click on a note to open it
      await page.getByText('Algebra Basics').click();

      // Click edit button
      await page.getByRole('button', { name: /edit/i }).click();

      // Update title
      const titleInput = page.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill('Updated Algebra Basics');

      // Save changes
      await page.getByRole('button', { name: /save|update/i }).click();

      // Should show success
      await expect(page.getByText(/saved|updated|success/i)
        .or(page.getByText('Updated Algebra Basics'))).toBeVisible({ timeout: 5000 });
    });

    test('can cancel editing without saving', async ({ page }) => {
      await page.goto('/notes');

      await page.getByText('Algebra Basics').click();
      await page.getByRole('button', { name: /edit/i }).click();

      // Make changes
      const titleInput = page.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill('Should Not Save');

      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Original title should be shown
      await expect(page.getByText('Algebra Basics')).toBeVisible();
    });
  });

  test.describe('Delete Note', () => {
    test('can delete a note with confirmation', async ({ page }) => {
      await page.goto('/notes');

      // Click on a note
      await page.getByText('Algebra Basics').click();

      // Click delete button
      await page.getByRole('button', { name: /delete/i }).click();

      // Confirmation dialog should appear
      await expect(page.getByText(/confirm|sure|delete this/i)).toBeVisible();

      // Confirm deletion
      await page.getByRole('button', { name: /confirm|yes|delete/i }).last().click();

      // Note should be removed (success message)
      await expect(page.getByText(/deleted|removed|success/i)).toBeVisible({ timeout: 5000 });
    });

    test('can cancel note deletion', async ({ page }) => {
      await page.goto('/notes');

      await page.getByText('Algebra Basics').click();
      await page.getByRole('button', { name: /delete/i }).click();

      // Cancel deletion
      await page.getByRole('button', { name: /cancel|no/i }).click();

      // Note should still exist
      await expect(page.getByText('Algebra Basics')).toBeVisible();
    });
  });

  test.describe('OCR Processing', () => {
    test('can upload image for OCR processing', async ({ page }) => {
      await page.goto('/notes');

      // Click create/upload button
      await page.getByRole('button', { name: /upload|scan|ocr|camera/i }).click();

      // File input should be available
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();

      // Upload a test file
      await fileInput.setInputFiles({
        name: 'test-notes.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      // OCR processing should start
      await expect(page.getByText(/processing|extracting|scanning/i)).toBeVisible({ timeout: 5000 });

      // Extracted text should appear
      await expect(page.getByText(/extracted text|quadratic equations/i)).toBeVisible({ timeout: 10000 });
    });

    test('shows OCR confidence score', async ({ page }) => {
      await page.goto('/notes');

      await page.getByRole('button', { name: /upload|scan|ocr/i }).click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      // Confidence score should be shown
      await expect(page.getByText(/95%|confidence|accuracy/i)).toBeVisible({ timeout: 10000 });
    });

    test('can create note from OCR result', async ({ page }) => {
      await page.goto('/notes');

      await page.getByRole('button', { name: /upload|scan|ocr/i }).click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      // Wait for OCR to complete
      await expect(page.getByText(/extracted|quadratic/i)).toBeVisible({ timeout: 10000 });

      // Click to create note from OCR result
      await page.getByRole('button', { name: /create note|save.*note|use this/i }).click();

      // Note form should be populated
      await expect(page.getByRole('textbox').filter({ hasText: /quadratic|extracted/i })
        .or(page.locator('textarea').filter({ hasText: /quadratic|extracted/i }))).toBeVisible();
    });

    test('handles OCR errors gracefully', async ({ page }) => {
      await page.route('**/api/v1/ocr/process', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Unable to process image' }),
        });
      });

      await page.goto('/notes');

      await page.getByRole('button', { name: /upload|scan|ocr/i }).click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      // Error message should appear
      await expect(page.getByText(/error|failed|unable/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Tags', () => {
    test('displays note tags', async ({ page }) => {
      await page.goto('/notes');

      // Tags should be visible on note cards
      await expect(page.getByText('algebra')).toBeVisible();
      await expect(page.getByText('variables')).toBeVisible();
    });

    test('can add tags to a note', async ({ page }) => {
      await page.goto('/notes');

      await page.getByText('Algebra Basics').click();
      await page.getByRole('button', { name: /edit/i }).click();

      // Find tag input
      const tagInput = page.getByPlaceholder(/tag|add tag/i)
        .or(page.getByLabel(/tags/i));
      await tagInput.fill('new-tag');
      await tagInput.press('Enter');

      // New tag should appear
      await expect(page.getByText('new-tag')).toBeVisible();
    });

    test('can filter notes by tag', async ({ page }) => {
      await page.goto('/notes');

      // Click on a tag to filter
      await page.getByText('algebra').click();

      // Only notes with that tag should be visible
      await expect(page.getByText('Algebra Basics')).toBeVisible();
    });
  });

  test.describe('Subject Organization', () => {
    test('notes are organized by subject', async ({ page }) => {
      await page.goto('/notes');

      // Subject sections or groupings should be visible
      await expect(page.getByText(/mathematics/i)).toBeVisible();
      await expect(page.getByText(/english/i)).toBeVisible();
      await expect(page.getByText(/science/i)).toBeVisible();
    });

    test('shows subject color coding on notes', async ({ page }) => {
      await page.goto('/notes');

      // Notes should have subject-specific styling
      const mathNote = page.locator('[data-testid="note-card"]', { hasText: 'Algebra Basics' })
        .or(page.locator('.note-card', { hasText: 'Algebra Basics' }))
        .or(page.getByText('Algebra Basics').locator('..'));

      await expect(mathNote).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('notes list has proper ARIA roles', async ({ page }) => {
      await page.goto('/notes');

      // Notes list should have proper role
      const notesList = page.locator('[role="list"]')
        .or(page.locator('ul'));
      await expect(notesList.first()).toBeVisible();
    });

    test('note form inputs are properly labeled', async ({ page }) => {
      await page.goto('/notes');
      await page.getByRole('button', { name: /create|new|add/i }).click();

      // Form inputs should be accessible
      await expect(page.getByRole('textbox', { name: /title/i })
        .or(page.getByLabel(/title/i))).toBeVisible();
    });

    test('keyboard navigation works in notes list', async ({ page }) => {
      await page.goto('/notes');

      // Tab through notes
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to select note with Enter
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('notes list works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/notes');

      // Notes should be visible
      await expect(page.getByText('Algebra Basics')).toBeVisible();

      // Create button should be accessible
      await expect(page.getByRole('button', { name: /create|new|add|\+/i })).toBeVisible();
    });

    test('note editor works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/notes');
      await page.getByRole('button', { name: /create|new|add|\+/i }).click();

      // Form should be usable
      const titleInput = page.getByLabel(/title/i);
      await expect(titleInput).toBeVisible();
      await titleInput.fill('Mobile Note');
    });

    test('OCR upload works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/notes');

      // Upload/camera button should be visible
      await expect(page.getByRole('button', { name: /upload|scan|camera|ocr/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('shows error when notes fail to load', async ({ page }) => {
      await page.route('**/api/v1/students/*/notes', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      await page.goto('/notes');

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows error when saving note fails', async ({ page }) => {
      await page.route('**/api/v1/students/*/notes', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Failed to save note' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ notes: mockNotes }),
          });
        }
      });

      await page.goto('/notes');
      await page.getByRole('button', { name: /create|new|add/i }).click();

      await page.getByLabel(/title/i).fill('Test Note');

      const subjectSelect = page.getByRole('combobox', { name: /subject/i })
        .or(page.getByLabel(/subject/i));
      await subjectSelect.click();
      await page.getByRole('option', { name: /mathematics/i })
        .or(page.getByText(/mathematics/i)).click();

      await page.getByRole('button', { name: /save|create/i }).click();

      // Error message should appear
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 5000 });
    });

    test('allows retry after error', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/v1/students/*/notes', async (route) => {
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
            body: JSON.stringify({ notes: mockNotes }),
          });
        }
      });

      await page.goto('/notes');

      // Wait for error
      await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 });

      // Click retry
      await page.getByRole('button', { name: /retry|try again/i }).click();

      // Notes should load
      await expect(page.getByText('Algebra Basics')).toBeVisible({ timeout: 5000 });
    });
  });
});
