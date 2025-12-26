import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OutcomeList } from '../OutcomeList'
import type { CurriculumOutcome } from '@/types/curriculum.types'

const mockOutcomes: CurriculumOutcome[] = [
  {
    id: '1',
    outcomeCode: 'MA3-RN-01',
    description: 'First outcome description',
    stage: 'S3',
    strand: 'Number and Algebra',
    substrand: 'Fractions',
    pathway: undefined,
    prerequisites: [],
    subjectId: 'sub-1',
    frameworkId: 'fw-1',
    displayOrder: 1,
  },
  {
    id: '2',
    outcomeCode: 'MA3-RN-02',
    description: 'Second outcome description',
    stage: 'S3',
    strand: 'Number and Algebra',
    substrand: 'Decimals',
    pathway: undefined,
    prerequisites: [],
    subjectId: 'sub-1',
    frameworkId: 'fw-1',
    displayOrder: 2,
  },
  {
    id: '3',
    outcomeCode: 'MA4-RN-01',
    description: 'Third outcome description',
    stage: 'S4',
    strand: 'Number and Algebra',
    substrand: 'Percentages',
    pathway: undefined,
    prerequisites: [],
    subjectId: 'sub-1',
    frameworkId: 'fw-1',
    displayOrder: 3,
  },
]

describe('OutcomeList', () => {
  it('renders all outcomes', () => {
    render(<OutcomeList outcomes={mockOutcomes} />)

    expect(screen.getByText('MA3-RN-01')).toBeInTheDocument()
    expect(screen.getByText('MA3-RN-02')).toBeInTheDocument()
    expect(screen.getByText('MA4-RN-01')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(<OutcomeList outcomes={[]} loading={true} />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(5)
  })

  it('shows empty message when no outcomes', () => {
    render(<OutcomeList outcomes={[]} />)

    expect(screen.getByText('No outcomes found')).toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(<OutcomeList outcomes={[]} emptyMessage="Custom empty" />)

    expect(screen.getByText('Custom empty')).toBeInTheDocument()
  })

  it('calls onOutcomeClick when outcome clicked', () => {
    const handleClick = vi.fn()
    render(
      <OutcomeList outcomes={mockOutcomes} onOutcomeClick={handleClick} />
    )

    fireEvent.click(screen.getByText('MA3-RN-01'))
    expect(handleClick).toHaveBeenCalledWith(mockOutcomes[0])
  })

  it('passes showStage prop to OutcomeCard', () => {
    render(<OutcomeList outcomes={mockOutcomes} showStage={false} />)

    // Stage badges should be hidden
    expect(screen.queryByText('S3')).not.toBeInTheDocument()
    expect(screen.queryByText('S4')).not.toBeInTheDocument()
  })

  it('passes compact prop to OutcomeCard', () => {
    render(<OutcomeList outcomes={mockOutcomes} compact={true} />)

    // Strand info should be hidden in compact mode
    expect(screen.queryByText('Number and Algebra')).not.toBeInTheDocument()
  })

  it('renders with list role and items', () => {
    render(<OutcomeList outcomes={mockOutcomes} />)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('applies custom className', () => {
    const { container } = render(
      <OutcomeList outcomes={mockOutcomes} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows error state when error provided', () => {
    const error = new Error('API connection timeout')
    render(<OutcomeList outcomes={[]} error={error} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load outcomes')).toBeInTheDocument()
    expect(screen.getByText('API connection timeout')).toBeInTheDocument()
  })

  it('shows error message from error object', () => {
    const error = new Error('Network connection failed')
    render(<OutcomeList outcomes={[]} error={error} />)

    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
  })

  it('shows retry button when onRetry provided', () => {
    const error = new Error('Test error')
    const handleRetry = vi.fn()
    render(<OutcomeList outcomes={[]} error={error} onRetry={handleRetry} />)

    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('calls onRetry when retry button clicked', () => {
    const error = new Error('Test error')
    const handleRetry = vi.fn()
    render(<OutcomeList outcomes={[]} error={error} onRetry={handleRetry} />)

    fireEvent.click(screen.getByText('Try again'))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('does not show retry button when onRetry not provided', () => {
    const error = new Error('Test error')
    render(<OutcomeList outcomes={[]} error={error} />)

    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })
})
