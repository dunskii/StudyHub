/**
 * AchievementUnlockModal component - celebration modal for achievement unlock.
 */

import { memo, useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Calculator,
  CheckCircle,
  Crown,
  Flame,
  FlaskConical,
  Layers,
  Rocket,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import type { Achievement, AchievementCategory } from '@/lib/api/gamification';

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
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

const categoryLabels: Record<AchievementCategory, string> = {
  engagement: 'Engagement',
  curriculum: 'Curriculum',
  milestone: 'Milestone',
  subject: 'Subject',
  challenge: 'Challenge',
};

export const AchievementUnlockModal = memo(function AchievementUnlockModal({
  achievement,
  isOpen,
  onClose,
}: AchievementUnlockModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !achievement) return null;

  const IconComponent = iconMap[achievement.icon] || Trophy;
  const categoryColor = categoryColors[achievement.category];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`
          relative z-10 bg-white rounded-2xl shadow-2xl
          p-8 max-w-sm w-full mx-4
          transform transition-all duration-500
          ${showContent ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Category badge */}
          <span
            className={`
              inline-block px-3 py-1 mb-4
              text-xs font-medium text-white
              rounded-full bg-gradient-to-r ${categoryColor}
            `}
          >
            {categoryLabels[achievement.category]}
          </span>

          <h2
            id="achievement-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            Achievement Unlocked!
          </h2>

          {/* Icon */}
          <div
            className={`
              mx-auto w-20 h-20 rounded-full
              flex items-center justify-center
              bg-gradient-to-br ${categoryColor}
              shadow-lg mb-4
              animate-bounce
            `}
            style={{ animationDuration: '1s' }}
          >
            <IconComponent className="w-10 h-10 text-white" aria-hidden="true" />
          </div>

          {/* Achievement name */}
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {achievement.name}
          </h3>

          {/* Description */}
          <p className="text-gray-600 mb-4">{achievement.description}</p>

          {/* XP reward */}
          {achievement.xpReward > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600 font-medium mb-6">
              <Zap className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>+{achievement.xpReward} XP</span>
            </div>
          )}

          {/* Continue button */}
          <button
            type="button"
            onClick={onClose}
            className={`
              w-full py-3 px-4
              bg-gradient-to-r ${categoryColor}
              text-white font-semibold rounded-lg
              hover:opacity-90
              transition-all duration-200
              shadow-lg hover:shadow-xl
            `}
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
});
