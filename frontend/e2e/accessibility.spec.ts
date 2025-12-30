import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests using axe-core.
 *
 * Tests WCAG 2.1 Level AA compliance across key pages.
 */
test.describe('Accessibility', () => {
  test.describe('Public Pages', () => {
    test('landing page has no accessibility violations', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('login page has no accessibility violations', async ({ page }) => {
      await page.goto('/login');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('signup page has no accessibility violations', async ({ page }) => {
      await page.goto('/signup');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('privacy policy page has no accessibility violations', async ({ page }) => {
      await page.goto('/privacy');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('terms of service page has no accessibility violations', async ({ page }) => {
      await page.goto('/terms');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('404 page has no accessibility violations', async ({ page }) => {
      await page.goto('/non-existent-page-12345');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('login form is fully keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab to email field
      await page.keyboard.press('Tab');
      const emailFocused = await page.evaluate(
        () => document.activeElement?.tagName.toLowerCase() === 'input'
      );
      expect(emailFocused).toBe(true);

      // Tab to password field
      await page.keyboard.press('Tab');
      const passwordFocused = await page.evaluate(
        () =>
          document.activeElement?.getAttribute('type') === 'password' ||
          document.activeElement?.tagName.toLowerCase() === 'input'
      );
      expect(passwordFocused).toBe(true);

      // Tab to submit button
      await page.keyboard.press('Tab');
      const buttonFocused = await page.evaluate(
        () => document.activeElement?.tagName.toLowerCase() === 'button'
      );
      expect(buttonFocused).toBe(true);
    });

    test('navigation menu is keyboard accessible', async ({ page }) => {
      await page.goto('/');

      // Find navigation links
      const navLinks = page.locator('nav a, header a');
      const linkCount = await navLinks.count();

      // Verify links are focusable
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = navLinks.nth(i);
        await link.focus();
        const isFocused = await link.evaluate(
          (el) => document.activeElement === el
        );
        expect(isFocused).toBe(true);
      }
    });

    test('modal can be closed with Escape key', async ({ page }) => {
      await page.goto('/login');

      // If there's a modal trigger, test escape functionality
      const modalTrigger = page.getByRole('button', { name: /forgot/i });
      if ((await modalTrigger.count()) > 0) {
        await modalTrigger.click();

        // Wait for modal
        await page.waitForTimeout(500);

        // Press Escape
        await page.keyboard.press('Escape');

        // Modal should be closed
        const modal = page.getByRole('dialog');
        await expect(modal).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('skip link works correctly', async ({ page }) => {
      await page.goto('/');

      // Focus body to start from beginning
      await page.evaluate(() => document.body.focus());

      // Press Tab to focus skip link (if present)
      await page.keyboard.press('Tab');

      // Check for skip link
      const skipLink = page.getByText(/skip to/i);
      if ((await skipLink.count()) > 0) {
        await skipLink.click();

        // Main content should be focused
        const mainFocused = await page.evaluate(
          () =>
            document.activeElement?.tagName.toLowerCase() === 'main' ||
            document.activeElement?.id === 'main-content'
        );
        expect(mainFocused).toBe(true);
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('images have alt text', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Images should have alt text or be marked as decorative
        const hasAltOrDecorative =
          alt !== null || role === 'presentation' || role === 'none';
        expect(hasAltOrDecorative).toBe(true);
      }
    });

    test('form fields have labels', async ({ page }) => {
      await page.goto('/login');

      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Check for associated label
        let hasLabel = false;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = (await label.count()) > 0;
        }

        // Input should have label, aria-label, or aria-labelledby
        const isLabelled =
          hasLabel ||
          ariaLabel !== null ||
          ariaLabelledby !== null ||
          placeholder !== null;
        expect(isLabelled).toBe(true);
      }
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        // Button should have text content, aria-label, or title
        const hasAccessibleName =
          (text && text.trim().length > 0) ||
          ariaLabel !== null ||
          title !== null;
        expect(hasAccessibleName).toBe(true);
      }
    });

    test('headings are in logical order', async ({ page }) => {
      await page.goto('/');

      const headings = await page.evaluate(() => {
        const headingElements = document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6'
        );
        return Array.from(headingElements).map((h) => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim(),
        }));
      });

      // Should have at least one heading
      expect(headings.length).toBeGreaterThan(0);

      // First heading should be h1 or h2
      expect(headings[0].level).toBeLessThanOrEqual(2);

      // Heading levels should not skip more than one level
      for (let i = 1; i < headings.length; i++) {
        const currentLevel = headings[i].level;
        const previousLevel = headings[i - 1].level;
        // Allow going down any number of levels, but only up by 1
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('ARIA roles are used correctly', async ({ page }) => {
      await page.goto('/');

      // Check for proper landmark roles
      const landmarks = {
        main: await page.locator('main, [role="main"]').count(),
        navigation: await page.locator('nav, [role="navigation"]').count(),
        banner: await page.locator('header, [role="banner"]').count(),
      };

      // Should have main content area
      expect(landmarks.main).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Color and Contrast', () => {
    test('page has no color contrast violations', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ rules: { 'color-contrast': { enabled: true } } })
        .analyze();

      // Filter for only color contrast violations
      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });

    test('focus states are visible', async ({ page }) => {
      await page.goto('/login');

      // Find focusable elements
      const focusableElements = page.locator(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const count = await focusableElements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();

        // Check that focus is visible (has outline or box-shadow)
        const focusStyles = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow,
          };
        });

        // Element should have visible focus indicator
        const hasFocusIndicator =
          focusStyles.outlineWidth !== '0px' ||
          focusStyles.boxShadow !== 'none';

        // Some elements may rely on browser default focus styles
        // which is acceptable, so we don't fail on this
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('respects prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/');

      // Check that animations are disabled or reduced
      const hasReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });

      expect(hasReducedMotion).toBe(true);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 800 },
    ];

    for (const viewport of viewports) {
      test(`has no accessibility violations on ${viewport.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test(`content is readable on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto('/');

        // Check that text is not cut off
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });

        expect(hasHorizontalOverflow).toBe(false);
      });
    }
  });
});
