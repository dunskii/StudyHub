/**
 * StreakCounter component - visual streak indicator with flame icon.
 */

import { memo } from 'react';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
  current: number;
  longest?: number;
  multiplier?: number;
  size?: 'sm' | 'md' | 'lg';
  showMultiplier?: boolean;
  showLongest?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'gap-1',
  md: 'gap-2',
  lg: 'gap-3',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

const subTextSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// Flame color based on streak length
function getFlameColor(streak: number): string {
  if (streak >= 100) return 'text-purple-500';
  if (streak >= 30) return 'text-red-500';
  if (streak >= 7) return 'text-orange-500';
  if (streak >= 3) return 'text-amber-500';
  return 'text-gray-400';
}

function getFlameAnimation(streak: number): string {
  if (streak >= 30) return 'animate-pulse';
  if (streak >= 7) return 'animate-bounce';
  return '';
}

export const StreakCounter = memo(function StreakCounter({
  current,
  longest,
  multiplier = 1,
  size = 'md',
  showMultiplier = false,
  showLongest = false,
  className = '',
}: StreakCounterProps) {
  const flameColor = getFlameColor(current);
  const flameAnimation = getFlameAnimation(current);
  const hasStreak = current > 0;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`flex items-center ${sizeClasses[size]}`}>
        <Flame
          className={`${iconSizes[size]} ${flameColor} ${flameAnimation} ${
            hasStreak ? 'fill-current' : ''
          }`}
          aria-hidden="true"
        />
        <span className={`font-bold ${textSizes[size]} ${flameColor}`}>
          {current}
        </span>
        <span className={`${subTextSizes[size]} text-gray-500`}>
          day{current !== 1 ? 's' : ''}
        </span>
      </div>

      {showMultiplier && multiplier > 1 && (
        <span
          className={`${subTextSizes[size]} text-amber-600 font-medium`}
          title="XP multiplier from streak"
        >
          {multiplier.toFixed(1)}x XP
        </span>
      )}

      {showLongest && longest !== undefined && longest > current && (
        <span className={`${subTextSizes[size]} text-gray-400`}>
          Best: {longest} days
        </span>
      )}

      {!hasStreak && (
        <span className={`${subTextSizes[size]} text-gray-400 mt-1`}>
          Start your streak!
        </span>
      )}
    </div>
  );
});
