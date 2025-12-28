/**
 * Tests for LevelBadge component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LevelBadge } from '../components/LevelBadge';

describe('LevelBadge', () => {
  it('renders level number', () => {
    render(<LevelBadge level={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows title when showTitle is true', () => {
    render(<LevelBadge level={5} title="Explorer" showTitle />);

    expect(screen.getByText('Explorer')).toBeInTheDocument();
  });

  it('hides title when showTitle is false', () => {
    render(<LevelBadge level={5} title="Explorer" showTitle={false} />);

    expect(screen.queryByText('Explorer')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender, container } = render(<LevelBadge level={1} size="sm" />);

    // Small size (w-8)
    let badge = container.querySelector('[class*="w-8"]');
    expect(badge).toBeInTheDocument();

    // Medium size (w-10)
    rerender(<LevelBadge level={1} size="md" />);
    badge = container.querySelector('[class*="w-10"]');
    expect(badge).toBeInTheDocument();

    // Large size (w-14)
    rerender(<LevelBadge level={1} size="lg" />);
    badge = container.querySelector('[class*="w-14"]');
    expect(badge).toBeInTheDocument();

    // Extra large size (w-20)
    rerender(<LevelBadge level={1} size="xl" />);
    badge = container.querySelector('[class*="w-20"]');
    expect(badge).toBeInTheDocument();
  });

  it('uses different colors for different levels', () => {
    const { rerender, container } = render(<LevelBadge level={1} />);

    // Level 1-4 should use gray
    let badgeInner = container.querySelector('[role="img"]') as HTMLElement;
    expect(badgeInner.className).toContain('gray');

    // Level 5-9 should use green
    rerender(<LevelBadge level={5} />);
    badgeInner = container.querySelector('[role="img"]') as HTMLElement;
    expect(badgeInner.className).toContain('green');

    // Level 10-14 should use blue
    rerender(<LevelBadge level={10} />);
    badgeInner = container.querySelector('[role="img"]') as HTMLElement;
    expect(badgeInner.className).toContain('blue');

    // Level 15-19 should use purple
    rerender(<LevelBadge level={15} />);
    badgeInner = container.querySelector('[role="img"]') as HTMLElement;
    expect(badgeInner.className).toContain('purple');

    // Level 20 should use amber/gold
    rerender(<LevelBadge level={20} />);
    badgeInner = container.querySelector('[role="img"]') as HTMLElement;
    expect(badgeInner.className).toContain('amber');
  });

  it('applies custom className', () => {
    const { container } = render(
      <LevelBadge level={5} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with proper accessibility', () => {
    render(<LevelBadge level={10} title="Scholar" />);

    // Level number should be visible
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
