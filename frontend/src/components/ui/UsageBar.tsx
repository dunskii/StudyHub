/**
 * UsageBar - Visual progress bar for displaying usage limits.
 *
 * Supports multiple thresholds with color transitions.
 */
import { cn } from '@/lib/utils';

interface UsageBarProps {
  /** Current usage value */
  value: number;
  /** Maximum value (100% mark) */
  max: number;
  /** Optional soft limit threshold (percentage) */
  softLimit?: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

export function UsageBar({
  value,
  max,
  softLimit = 67, // Default soft limit at 2/3
  showPercentage = true,
  label,
  size = 'md',
  className,
}: UsageBarProps) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOverSoftLimit = percentage >= softLimit;
  const isAtLimit = percentage >= 100;

  // Determine color based on usage level
  const getBarColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isOverSoftLimit) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  // Size variants
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const textClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={cn('w-full', className)}>
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="mb-1 flex items-center justify-between">
          {label && (
            <span className={cn('font-medium text-gray-700', textClass)}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span
              className={cn(
                textClass,
                isAtLimit
                  ? 'font-semibold text-red-600'
                  : isOverSoftLimit
                  ? 'font-medium text-amber-600'
                  : 'text-gray-500'
              )}
            >
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200',
          heightClass
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Usage'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getBarColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Warning text for limits */}
      {isAtLimit && (
        <p className="mt-1 text-xs font-medium text-red-600">
          Limit reached
        </p>
      )}
      {isOverSoftLimit && !isAtLimit && (
        <p className="mt-1 text-xs text-amber-600">
          Approaching limit
        </p>
      )}
    </div>
  );
}
