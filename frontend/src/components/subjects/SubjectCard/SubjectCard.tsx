/**
 * SubjectCard component
 *
 * Displays a subject with its icon, name, and colour.
 * Used in subject grids and selectors.
 * Memoized to prevent unnecessary re-renders in lists.
 */
import { forwardRef, memo } from 'react'
import {
  Calculator,
  BookOpen,
  FlaskConical,
  Globe,
  HeartPulse,
  Wrench,
  Palette,
  Languages,
  BookText,
  type LucideIcon,
} from 'lucide-react'
import type { Subject } from '@/types/subject.types'
import { cn } from '@/lib/utils'

export interface SubjectCardProps {
  /** The subject to display */
  subject: Subject
  /** Whether the card is selected */
  selected?: boolean
  /** Whether the card is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/** Map subject icon names to Lucide icon components */
const iconMap: Record<string, LucideIcon> = {
  calculator: Calculator,
  'book-open': BookOpen,
  'flask-conical': FlaskConical,
  globe: Globe,
  'heart-pulse': HeartPulse,
  wrench: Wrench,
  palette: Palette,
  languages: Languages,
}

/** Default icon when no match is found */
const DefaultIcon = BookText

/**
 * Render a Lucide icon by name.
 */
function SubjectIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = iconMap[name] || DefaultIcon

  return (
    <IconComponent
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    />
  )
}

const SubjectCardComponent = forwardRef<HTMLButtonElement, SubjectCardProps>(
  ({ subject, selected = false, disabled = false, onClick, className, size = 'md' }, ref) => {
    const sizeClasses = {
      sm: 'p-3 gap-2',
      md: 'p-4 gap-3',
      lg: 'p-6 gap-4',
    }

    const iconSizeClasses = {
      sm: 'h-5 w-5',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          // Base styles
          'flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200',
          sizeClasses[size],
          // Colour based on subject
          'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Selected state
          selected
            ? 'border-current ring-2 ring-offset-2'
            : 'border-gray-200 hover:border-gray-300',
          // Disabled state
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        style={{
          '--subject-color': subject.color || '#6B7280',
          borderColor: selected ? subject.color || '#6B7280' : undefined,
          color: selected ? subject.color || '#6B7280' : undefined,
        } as React.CSSProperties}
        aria-pressed={selected}
        aria-disabled={disabled}
      >
        <SubjectIcon name={subject.icon || 'book-open'} className={iconSizeClasses[size]} />
        <span
          className={cn(
            'font-medium text-center',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-lg'
          )}
        >
          {subject.name}
        </span>
        {subject.description && size === 'lg' && (
          <span className="text-sm text-gray-500 text-center line-clamp-2">
            {subject.description}
          </span>
        )}
      </button>
    )
  }
)

SubjectCardComponent.displayName = 'SubjectCard'

export const SubjectCard = memo(SubjectCardComponent)

export default SubjectCard
