/**
 * Accessibility utilities for StudyHub.
 *
 * Follows WCAG 2.1 guidelines and best practices for
 * creating accessible educational applications.
 */

/**
 * Generate a unique ID for ARIA associations.
 */
export function generateId(prefix: string = 'sh'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ARIA described-by ID for form field errors.
 */
export function getErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/**
 * Create ARIA described-by ID for form field hints.
 */
export function getHintId(fieldId: string): string {
  return `${fieldId}-hint`;
}

/**
 * Combine multiple ARIA described-by IDs.
 */
export function combineDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

/**
 * Announce a message to screen readers.
 * Creates a visually hidden element with role="status" or role="alert".
 */
export function announce(
  message: string,
  options: { priority?: 'polite' | 'assertive'; duration?: number } = {}
): void {
  const { priority = 'polite', duration = 3000 } = options;

  const announcer = document.createElement('div');
  announcer.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  // Remove after duration
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, duration);
}

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Get all focusable elements within a container.
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(selector));
  },

  /**
   * Trap focus within a container (for modals).
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Return focus to a specific element when a modal/dialog closes.
   */
  returnFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        element.focus();
      }, 0);
    }
  },
};

/**
 * Keyboard navigation utilities
 */
export const keyboardUtils = {
  /**
   * Check if a keyboard event is an activation key (Enter or Space).
   */
  isActivationKey(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ';
  },

  /**
   * Check if a keyboard event is an arrow key.
   */
  isArrowKey(event: KeyboardEvent): boolean {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
  },

  /**
   * Check if a keyboard event is the Escape key.
   */
  isEscapeKey(event: KeyboardEvent): boolean {
    return event.key === 'Escape';
  },

  /**
   * Handle roving tabindex navigation.
   * Returns the new index.
   */
  handleRovingTabIndex(
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ): number {
    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    if (event.key === prevKey) {
      return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
    }
    if (event.key === nextKey) {
      return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
    }
    if (event.key === 'Home') {
      return 0;
    }
    if (event.key === 'End') {
      return totalItems - 1;
    }

    return currentIndex;
  },
};

/**
 * Color contrast utilities
 */
export const contrastUtils = {
  /**
   * Check if a color combination meets WCAG AA contrast requirements.
   * Requires at least 4.5:1 for normal text, 3:1 for large text.
   */
  meetsContrastRatio(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): boolean {
    const minRatio = isLargeText ? 3 : 4.5;
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= minRatio;
  },

  /**
   * Calculate the contrast ratio between two colors.
   */
  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Get the relative luminance of a color.
   */
  getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      const srgb = c / 255;
      return srgb <= 0.03928
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  },

  /**
   * Convert hex color to RGB.
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : null;
  },
};

/**
 * Screen reader text utilities
 */
export const srOnly = {
  /**
   * CSS class for visually hidden text (screen reader only).
   */
  className: 'sr-only',

  /**
   * CSS styles for visually hidden text.
   */
  styles: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  },
};

/**
 * Reduced motion detection
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}
