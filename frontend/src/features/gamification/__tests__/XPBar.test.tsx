/**
 * Tests for XPBar component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { XPBar } from '../components/XPBar';

describe('XPBar', () => {
  const defaultProps = {
    currentXp: 150,
    levelStartXp: 100,
    nextLevelXp: 300,
    progressPercent: 25,
  };

  it('renders XP progress bar', () => {
    render(<XPBar {...defaultProps} />);

    // Check for progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays XP label when showLabel is true', () => {
    render(<XPBar {...defaultProps} showLabel />);

    // currentXp: 150
    expect(screen.getByText(/150/)).toBeInTheDocument();
    // Progress is (currentXp - levelStartXp) / (nextLevelXp - levelStartXp)
    // So we show "50 / 200 to next level" (150-100=50, 300-100=200)
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<XPBar {...defaultProps} showLabel={false} />);

    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
  });

  it('renders with correct aria attributes', () => {
    render(<XPBar {...defaultProps} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('handles 0% progress', () => {
    render(
      <XPBar
        currentXp={100}
        levelStartXp={100}
        nextLevelXp={200}
        progressPercent={0}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles 100% progress', () => {
    render(
      <XPBar
        currentXp={300}
        levelStartXp={200}
        nextLevelXp={300}
        progressPercent={100}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<XPBar {...defaultProps} size="sm" />);

    // Test small size (h-1.5)
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar.className).toContain('h-1.5');

    // Test medium size (h-2.5)
    rerender(<XPBar {...defaultProps} size="md" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar.className).toContain('h-2.5');

    // Test large size (h-4)
    rerender(<XPBar {...defaultProps} size="lg" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar.className).toContain('h-4');
  });

  it('applies custom className', () => {
    const { container } = render(
      <XPBar {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
