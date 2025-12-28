/**
 * Tests for XPToast component.
 */

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XPToast } from '../components/XPToast';

describe('XPToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders XP amount', () => {
    render(<XPToast xp={50} />);

    expect(screen.getByText(/\+50.*XP/)).toBeInTheDocument();
  });

  it('displays multiplier when provided', () => {
    render(<XPToast xp={50} multiplier={1.5} />);

    expect(screen.getByText(/1\.5x/)).toBeInTheDocument();
    expect(screen.getByText(/bonus/i)).toBeInTheDocument();
  });

  it('hides multiplier when value is 1', () => {
    render(<XPToast xp={50} multiplier={1.0} />);

    expect(screen.queryByText(/bonus/i)).not.toBeInTheDocument();
  });

  it('displays source when provided', () => {
    render(<XPToast xp={50} source="session_complete" />);

    expect(screen.getByText(/session complete/i)).toBeInTheDocument();
  });

  it('has status role for accessibility', () => {
    render(<XPToast xp={50} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live polite for screen readers', () => {
    render(<XPToast xp={50} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss after duration', () => {
    const onDismiss = vi.fn();
    render(<XPToast xp={50} onDismiss={onDismiss} duration={1000} />);

    expect(onDismiss).not.toHaveBeenCalled();

    // Fast-forward time past the duration + exit animation
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses default duration of 3000ms', () => {
    const onDismiss = vi.fn();
    render(<XPToast xp={50} onDismiss={onDismiss} />);

    // Before duration
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // After duration + exit animation
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders with zap/lightning icon', () => {
    const { container } = render(<XPToast xp={100} />);

    // Should have an icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('formats source text (replaces underscores)', () => {
    render(<XPToast xp={50} source="flashcard_reviewed" />);

    // Should convert underscores to spaces
    expect(screen.getByText(/flashcard reviewed/i)).toBeInTheDocument();
  });
});
