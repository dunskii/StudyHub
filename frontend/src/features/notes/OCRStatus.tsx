/**
 * OCR status badge component.
 */
import { memo } from 'react'
import { CheckCircle, Clock, AlertCircle, Loader2, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type OCRStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable'

interface OCRStatusProps {
  /** OCR status */
  status: OCRStatusType | string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Show label */
  showLabel?: boolean
  /** Custom class name */
  className?: string
}

const statusConfig: Record<
  OCRStatusType,
  {
    icon: typeof CheckCircle
    label: string
    bgColor: string
    textColor: string
    iconColor: string
  }
> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
  not_applicable: {
    icon: MinusCircle,
    label: 'N/A',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    iconColor: 'text-gray-400',
  },
}

/**
 * OCRStatus displays the OCR processing status as a badge.
 */
export const OCRStatus = memo(function OCRStatus({
  status,
  size = 'md',
  showLabel = false,
  className,
}: OCRStatusProps) {
  const config = statusConfig[status as OCRStatusType] || statusConfig.pending
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      <Icon
        className={cn(
          iconSizes[size],
          config.iconColor,
          status === 'processing' && 'animate-spin'
        )}
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
})

export default OCRStatus
