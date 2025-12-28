/**
 * XPBar component - horizontal progress bar showing XP to next level.
 */

import { memo } from 'react';
import { Zap } from 'lucide-react';

interface XPBarProps {
  currentXp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const XPBar = memo(function XPBar({
  currentXp,
  levelStartXp,
  nextLevelXp,
  progressPercent,
  showLabel = true,
  size = 'md',
  className = '',
}: XPBarProps) {
  const xpInLevel = currentXp - levelStartXp;
  const xpNeeded = nextLevelXp ? nextLevelXp - levelStartXp : 0;
  const isMaxLevel = nextLevelXp === null;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div
          className={`flex items-center justify-between mb-1 ${textSizeClasses[size]}`}
        >
          <div className="flex items-center gap-1 text-amber-600 font-medium">
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>{currentXp.toLocaleString()} XP</span>
          </div>
          {!isMaxLevel && (
            <span className="text-gray-500">
              {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} to next
              level
            </span>
          )}
          {isMaxLevel && (
            <span className="text-amber-600 font-medium">Max Level!</span>
          )}
        </div>
      )}

      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`XP progress: ${progressPercent.toFixed(0)}%`}
      >
        <div
          className={`${sizeClasses[size]} bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
});
