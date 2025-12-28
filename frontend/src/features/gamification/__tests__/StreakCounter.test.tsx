/**
 * Tests for StreakCounter component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StreakCounter } from '../components/StreakCounter';

describe('StreakCounter', () => {
  it('renders current streak count', () => {
    render(<StreakCounter current={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows singular "day" for streak of 1', () => {
    render(<StreakCounter current={1} />);

    expect(screen.getByText('day')).toBeInTheDocument();
    expect(screen.queryByText('days')).not.toBeInTheDocument();
  });

  it('shows plural "days" for streak > 1', () => {
    render(<StreakCounter current={5} />);

    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('displays longest streak when showLongest is true', () => {
    render(<StreakCounter current={7} longest={14} showLongest />);

    expect(screen.getByText(/best.*14/i)).toBeInTheDocument();
  });

  it('hides longest streak when showLongest is false', () => {
    render(<StreakCounter current={7} longest={14} showLongest={false} />);

    expect(screen.queryByText(/best/i)).not.toBeInTheDocument();
  });

  it('displays multiplier when showMultiplier is true', () => {
    render(<StreakCounter current={7} multiplier={1.2} showMultiplier />);

    // Component shows "{multiplier.toFixed(1)}x XP"
    expect(screen.getByText(/1\.2x XP/)).toBeInTheDocument();
  });

  it('hides multiplier when showMultiplier is false', () => {
    render(<StreakCounter current={7} multiplier={1.2} showMultiplier={false} />);

    expect(screen.queryByText(/1\.2x/)).not.toBeInTheDocument();
  });

  it('hides multiplier when multiplier is 1.0', () => {
    render(<StreakCounter current={2} multiplier={1.0} showMultiplier />);

    // No bonus for 1.0 multiplier
    expect(screen.queryByText(/bonus/i)).not.toBeInTheDocument();
  });

  it('renders flame icon', () => {
    const { container } = render(<StreakCounter current={5} />);

    // Should have a flame icon
    const flameIcon = container.querySelector('svg');
    expect(flameIcon).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender, container } = render(
      <StreakCounter current={5} size="sm" />
    );

    // Small size - check for text-sm class on inner elements
    let innerText = container.querySelector('[class*="text-sm"]');
    expect(innerText).toBeInTheDocument();

    // Medium size - check for text-lg class
    rerender(<StreakCounter current={5} size="md" />);
    innerText = container.querySelector('[class*="text-lg"]');
    expect(innerText).toBeInTheDocument();

    // Large size - check for text-2xl class
    rerender(<StreakCounter current={5} size="lg" />);
    innerText = container.querySelector('[class*="text-2xl"]');
    expect(innerText).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StreakCounter current={5} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles zero streak', () => {
    render(<StreakCounter current={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });
});
