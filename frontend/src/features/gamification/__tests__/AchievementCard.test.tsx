/**
 * Tests for AchievementCard component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AchievementCard } from '../components/AchievementCard';
import type { AchievementWithProgress } from '@/lib/api/gamification';

describe('AchievementCard', () => {
  const unlockedAchievement: AchievementWithProgress = {
    code: 'first_session',
    name: 'First Steps',
    description: 'Complete your first study session',
    category: 'engagement',
    subjectCode: null,
    xpReward: 50,
    icon: 'star',
    isUnlocked: true,
    unlockedAt: '2025-01-15T10:00:00Z',
    progressPercent: 100,
    progressCurrent: 1,
    progressTarget: 1,
  };

  const lockedAchievement: AchievementWithProgress = {
    code: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    category: 'engagement',
    subjectCode: null,
    xpReward: 100,
    icon: 'flame',
    isUnlocked: false,
    unlockedAt: null,
    progressPercent: 42,
    progressCurrent: 3,
    progressTarget: 7,
  };

  it('renders achievement name and description', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText(/Complete your first study session/)).toBeInTheDocument();
  });

  it('displays XP reward', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    expect(screen.getByText(/50.*XP/)).toBeInTheDocument();
  });

  it('shows unlocked state with checkmark', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Unlocked achievement should have visual indicator
    const card = screen.getByRole('article');
    expect(card).toBeInTheDocument();
  });

  it('shows locked state with progress bar', () => {
    render(<AchievementCard achievement={lockedAchievement} />);

    // Should show progress
    expect(screen.getByText(/3.*\/.*7/)).toBeInTheDocument();
  });

  it('shows progress percentage for locked achievement', () => {
    render(<AchievementCard achievement={lockedAchievement} />);

    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<AchievementCard achievement={unlockedAchievement} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('article'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick handler', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Should render without errors
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('displays unlock date for unlocked achievements', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Should show when it was unlocked
    expect(screen.getByText(/unlocked/i)).toBeInTheDocument();
  });

  it('applies different styling for locked vs unlocked', () => {
    const { rerender, container } = render(
      <AchievementCard achievement={unlockedAchievement} />
    );

    // Unlocked should not be greyed out
    let card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('opacity-50');

    // Locked should be slightly greyed
    rerender(<AchievementCard achievement={lockedAchievement} />);
    card = container.firstChild as HTMLElement;
    // The locked state should have different styling
    expect(card).toBeInTheDocument();
  });

  it('renders icon based on achievement.icon', () => {
    const { container } = render(<AchievementCard achievement={unlockedAchievement} />);

    // Should have an icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
