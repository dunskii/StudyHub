import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubjectGrid } from '../SubjectGrid'
import type { Subject } from '@/types/subject.types'

const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Mathematics',
    code: 'MATH',
    kla: 'Mathematics',
    description: 'Math description',
    icon: 'calculator',
    color: '#3B82F6',
    availableStages: ['S1', 'S2'],
    frameworkId: 'fw-1',
    displayOrder: 1,
    isActive: true,
    config: {
      hasPathways: false,
      pathways: [],
      seniorCourses: [],
      assessmentTypes: [],
      tutorStyle: 'socratic_stepwise',
    },
  },
  {
    id: '2',
    name: 'English',
    code: 'ENG',
    kla: 'English',
    description: 'English description',
    icon: 'book-open',
    color: '#8B5CF6',
    availableStages: ['S1', 'S2'],
    frameworkId: 'fw-1',
    displayOrder: 2,
    isActive: true,
    config: {
      hasPathways: false,
      pathways: [],
      seniorCourses: [],
      assessmentTypes: [],
      tutorStyle: 'mentor_guide',
    },
  },
  {
    id: '3',
    name: 'Science',
    code: 'SCI',
    kla: 'Science',
    description: 'Science description',
    icon: 'flask-conical',
    color: '#10B981',
    availableStages: ['S1', 'S2'],
    frameworkId: 'fw-1',
    displayOrder: 3,
    isActive: true,
    config: {
      hasPathways: false,
      pathways: [],
      seniorCourses: [],
      assessmentTypes: [],
      tutorStyle: 'inquiry_based',
    },
  },
]

describe('SubjectGrid', () => {
  it('renders all subjects', () => {
    render(<SubjectGrid subjects={mockSubjects} />)

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(<SubjectGrid subjects={[]} loading={true} />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty message when no subjects', () => {
    render(<SubjectGrid subjects={[]} />)

    expect(screen.getByText('No subjects available')).toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(
      <SubjectGrid subjects={[]} emptyMessage="Custom empty message" />
    )

    expect(screen.getByText('Custom empty message')).toBeInTheDocument()
  })

  it('calls onSubjectClick when subject clicked', () => {
    const handleClick = vi.fn()
    render(
      <SubjectGrid subjects={mockSubjects} onSubjectClick={handleClick} />
    )

    fireEvent.click(screen.getByText('Mathematics'))
    expect(handleClick).toHaveBeenCalledWith(mockSubjects[0])
  })

  it('shows selected state for selected subjects', () => {
    render(
      <SubjectGrid
        subjects={mockSubjects}
        selectedIds={['1']}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders with different column configurations', () => {
    const { container } = render(
      <SubjectGrid subjects={mockSubjects} columns={4} />
    )

    expect(container.firstChild).toHaveClass('lg:grid-cols-4')
  })

  it('applies custom className', () => {
    const { container } = render(
      <SubjectGrid subjects={mockSubjects} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('disables all cards when disabled', () => {
    render(<SubjectGrid subjects={mockSubjects} disabled={true} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('shows error state when error provided', () => {
    const error = new Error('API connection timeout')
    render(<SubjectGrid subjects={[]} error={error} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load subjects')).toBeInTheDocument()
    expect(screen.getByText('API connection timeout')).toBeInTheDocument()
  })

  it('shows error message from error object', () => {
    const error = new Error('Network connection failed')
    render(<SubjectGrid subjects={[]} error={error} />)

    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
  })

  it('shows retry button when onRetry provided', () => {
    const error = new Error('Test error')
    const handleRetry = vi.fn()
    render(<SubjectGrid subjects={[]} error={error} onRetry={handleRetry} />)

    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('calls onRetry when retry button clicked', () => {
    const error = new Error('Test error')
    const handleRetry = vi.fn()
    render(<SubjectGrid subjects={[]} error={error} onRetry={handleRetry} />)

    fireEvent.click(screen.getByText('Try again'))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('does not show retry button when onRetry not provided', () => {
    const error = new Error('Test error')
    render(<SubjectGrid subjects={[]} error={error} />)

    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })
})
