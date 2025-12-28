/**
 * AchievementCard component - displays a single achievement (locked/unlocked).
 */

import { memo } from 'react';
import {
  Award,
  BookOpen,
  Calculator,
  CheckCircle,
  Crown,
  Flame,
  FlaskConical,
  Layers,
  Lock,
  Rocket,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AchievementWithProgress, AchievementCategory } from '@/lib/api/gamification';

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  'book-open': BookOpen,
  calculator: Calculator,
  'check-circle': CheckCircle,
  crown: Crown,
  flame: Flame,
  'flask-conical': FlaskConical,
  layers: Layers,
  rocket: Rocket,
  star: Star,
  target: Target,
  trophy: Trophy,
  zap: Zap,
};

// Category colors
const categoryColors: Record<AchievementCategory, string> = {
  engagement: 'from-orange-400 to-orange-600',
  curriculum: 'from-green-400 to-green-600',
  milestone: 'from-blue-400 to-blue-600',
  subject: 'from-purple-400 to-purple-600',
  challenge: 'from-red-400 to-red-600',
};

const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const titleSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const AchievementCard = memo(function AchievementCard({
  achievement,
  size = 'md',
  onClick,
  className = '',
}: AchievementCardProps) {
  const IconComponent = iconMap[achievement.icon] || Star;
  const isUnlocked = achievement.isUnlocked;
  const categoryColor = categoryColors[achievement.category];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        relative flex flex-col items-center text-center
        rounded-xl border-2 transition-all duration-200
        ${sizeClasses[size]}
        ${
          isUnlocked
            ? `bg-white border-gray-200 hover:border-gray-300 hover:shadow-md`
            : `bg-gray-50 border-gray-100 opacity-60`
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      aria-label={`${achievement.name}: ${achievement.description}${
        isUnlocked ? ' - Unlocked' : ' - Locked'
      }`}
    >
      {/* Icon */}
      <div
        className={`
          rounded-full p-2 mb-2
          ${
            isUnlocked
              ? `bg-gradient-to-br ${categoryColor} text-white`
              : 'bg-gray-200 text-gray-400'
          }
        `}
      >
        {isUnlocked ? (
          <IconComponent className={iconSizeClasses[size]} aria-hidden="true" />
        ) : (
          <Lock className={iconSizeClasses[size]} aria-hidden="true" />
        )}
      </div>

      {/* Name */}
      <h3
        className={`font-semibold ${titleSizeClasses[size]} ${
          isUnlocked ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {achievement.name}
      </h3>

      {/* Description */}
      <p
        className={`text-xs mt-1 ${
          isUnlocked ? 'text-gray-600' : 'text-gray-400'
        } line-clamp-2`}
      >
        {achievement.description}
      </p>

      {/* XP Reward */}
      {achievement.xpReward > 0 && (
        <div
          className={`flex items-center gap-1 mt-2 text-xs ${
            isUnlocked ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          <Zap className="w-3 h-3" aria-hidden="true" />
          <span>+{achievement.xpReward} XP</span>
        </div>
      )}

      {/* Progress bar for locked achievements */}
      {!isUnlocked && achievement.progressPercent > 0 && (
        <div className="w-full mt-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${categoryColor} transition-all duration-300`}
              style={{ width: `${achievement.progressPercent}%` }}
            />
          </div>
          {achievement.progressText && (
            <span className="text-xs text-gray-400 mt-1">
              {achievement.progressText}
            </span>
          )}
        </div>
      )}

      {/* Unlocked date */}
      {isUnlocked && achievement.unlockedAt && (
        <span className="text-xs text-gray-400 mt-2">
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </span>
      )}
    </button>
  );
});
