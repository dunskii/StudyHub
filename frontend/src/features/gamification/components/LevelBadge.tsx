/**
 * LevelBadge component - circular badge showing level number.
 */

import { memo } from 'react';
import { Star } from 'lucide-react';

interface LevelBadgeProps {
  level: number;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTitle?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-3xl',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-7 h-7',
};

const titleSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

// Level color tiers
function getLevelColor(level: number): string {
  if (level >= 20) return 'from-amber-400 to-yellow-500 ring-amber-300';
  if (level >= 15) return 'from-purple-400 to-purple-600 ring-purple-300';
  if (level >= 10) return 'from-blue-400 to-blue-600 ring-blue-300';
  if (level >= 5) return 'from-green-400 to-green-600 ring-green-300';
  return 'from-gray-400 to-gray-600 ring-gray-300';
}

export const LevelBadge = memo(function LevelBadge({
  level,
  title,
  size = 'md',
  showTitle = false,
  className = '',
}: LevelBadgeProps) {
  const colorClasses = getLevelColor(level);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div
        className={`
          relative flex items-center justify-center rounded-full
          bg-gradient-to-br ${colorClasses}
          ring-2 ring-offset-2
          font-bold text-white
          shadow-lg
          ${sizeClasses[size]}
        `}
        role="img"
        aria-label={`Level ${level}${title ? `: ${title}` : ''}`}
      >
        {level}
        {level >= 20 && (
          <Star
            className={`absolute -top-1 -right-1 ${iconSizes[size]} text-yellow-300 fill-yellow-300`}
            aria-hidden="true"
          />
        )}
      </div>
      {showTitle && title && (
        <span className={`text-gray-600 font-medium ${titleSizes[size]}`}>
          {title}
        </span>
      )}
    </div>
  );
});
