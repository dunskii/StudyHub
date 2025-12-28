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

    // Small size
    let badge = container.querySelector('[class*="w-8"]');
    expect(badge).toBeInTheDocument();

    // Medium size
    rerender(<LevelBadge level={1} size="md" />);
    badge = container.querySelector('[class*="w-10"]');
    expect(badge).toBeInTheDocument();

    // Large size
    rerender(<LevelBadge level={1} size="lg" />);
    badge = container.querySelector('[class*="w-12"]');
    expect(badge).toBeInTheDocument();

    // Extra large size
    rerender(<LevelBadge level={1} size="xl" />);
    badge = container.querySelector('[class*="w-16"]');
    expect(badge).toBeInTheDocument();
  });

  it('uses different colors for different levels', () => {
    const { rerender, container } = render(<LevelBadge level={1} />);

    // Level 1-4 should use gray/neutral
    let badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('gray');

    // Level 5-9 should use blue
    rerender(<LevelBadge level={5} />);
    badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('blue');

    // Level 10-14 should use purple
    rerender(<LevelBadge level={10} />);
    badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('purple');

    // Level 15-19 should use amber
    rerender(<LevelBadge level={15} />);
    badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('amber');

    // Level 20 should use gradient/gold
    rerender(<LevelBadge level={20} />);
    badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('gradient');
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
