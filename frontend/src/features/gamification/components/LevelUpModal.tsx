/**
 * LevelUpModal component - celebration modal for level up.
 */

import { memo, useEffect, useState } from 'react';
import { Star, Sparkles, X } from 'lucide-react';
import { LevelBadge } from './LevelBadge';

interface LevelUpModalProps {
  level: number;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LevelUpModal = memo(function LevelUpModal({
  level,
  title,
  isOpen,
  onClose,
}: LevelUpModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay content animation for entrance effect
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
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

        {/* Sparkles decoration */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <Sparkles
            className="w-12 h-12 text-amber-400 animate-pulse"
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="text-center pt-4">
          <h2
            id="level-up-title"
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Level Up!
          </h2>

          <p className="text-gray-600 mb-6">
            Congratulations! You&apos;ve reached a new level.
          </p>

          {/* Level badge */}
          <div className="flex justify-center mb-6">
            <LevelBadge level={level} title={title} size="xl" showTitle />
          </div>

          {/* Stars decoration */}
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 text-amber-400 fill-amber-400 animate-bounce`}
                style={{ animationDelay: `${i * 100}ms` }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Continue button */}
          <button
            type="button"
            onClick={onClose}
            className="
              w-full py-3 px-4
              bg-gradient-to-r from-amber-500 to-amber-600
              text-white font-semibold rounded-lg
              hover:from-amber-600 hover:to-amber-700
              transition-all duration-200
              shadow-lg hover:shadow-xl
            "
          >
            Keep Learning!
          </button>
        </div>
      </div>
    </div>
  );
});
