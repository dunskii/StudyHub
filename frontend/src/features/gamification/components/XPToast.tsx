/**
 * XPToast component - notification for XP earned.
 */

import { memo, useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface XPToastProps {
  xp: number;
  multiplier?: number;
  source?: string;
  onDismiss?: () => void;
  duration?: number;
}

export const XPToast = memo(function XPToast({
  xp,
  multiplier = 1,
  source,
  onDismiss,
  duration = 3000,
}: XPToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-20 right-4 z-50
        flex items-center gap-2
        bg-gradient-to-r from-amber-500 to-amber-600
        text-white rounded-lg shadow-lg
        px-4 py-3
        transition-all duration-300
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="status"
      aria-live="polite"
    >
      <Zap className="w-5 h-5 fill-white" aria-hidden="true" />
      <div>
        <span className="font-bold text-lg">+{xp} XP</span>
        {multiplier > 1 && (
          <span className="ml-2 text-amber-200 text-sm">
            ({multiplier.toFixed(1)}x streak bonus!)
          </span>
        )}
      </div>
      {source && (
        <span className="text-amber-200 text-sm ml-2">
          {source.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
});
