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
    progressText: 'Completed!',
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
    progressText: '3/7 day streak',
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

  it('shows unlocked state with icon', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Unlocked achievement should have visual indicator (button element)
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
  });

  it('shows locked state with progress text', () => {
    render(<AchievementCard achievement={lockedAchievement} />);

    // Should show progress text
    expect(screen.getByText(/3\/7 day streak/)).toBeInTheDocument();
  });

  it('shows progress bar for locked achievement', () => {
    const { container } = render(<AchievementCard achievement={lockedAchievement} />);

    // There should be a progress bar div with the category color gradient
    const progressBar = container.querySelector('[class*="bg-gradient"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<AchievementCard achievement={unlockedAchievement} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick handler', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Should render without errors
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('displays unlock date for unlocked achievements', () => {
    render(<AchievementCard achievement={unlockedAchievement} />);

    // Should show the date it was unlocked (formatted as local date)
    // The component shows: new Date(achievement.unlockedAt).toLocaleDateString()
    const date = new Date('2025-01-15T10:00:00Z').toLocaleDateString();
    expect(screen.getByText(date)).toBeInTheDocument();
  });

  it('applies different styling for locked vs unlocked', () => {
    const { rerender, container } = render(
      <AchievementCard achievement={unlockedAchievement} />
    );

    // Unlocked should not have opacity-60 (locked state uses opacity-60)
    let card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('opacity-60');

    // Locked should have opacity-60
    rerender(<AchievementCard achievement={lockedAchievement} />);
    card = container.firstChild as HTMLElement;
    expect(card.className).toContain('opacity-60');
  });

  it('renders icon based on achievement.icon', () => {
    const { container } = render(<AchievementCard achievement={unlockedAchievement} />);

    // Should have an icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
