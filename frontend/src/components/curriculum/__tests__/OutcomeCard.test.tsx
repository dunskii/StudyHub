import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OutcomeCard } from '../OutcomeCard'
import type { CurriculumOutcome } from '@/types/curriculum.types'

const mockOutcome: CurriculumOutcome = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  outcomeCode: 'MA3-RN-01',
  description:
    'Compares and orders fractions with denominators of 2, 3, 4, 5, 6, 8, 10, 12 and 100',
  stage: 'S3',
  strand: 'Number and Algebra',
  substrand: 'Fractions and Decimals',
  pathway: undefined,
  prerequisites: ['MA2-RN-01', 'MA2-RN-02'],
  subjectId: 'sub-1',
  frameworkId: 'fw-1',
  displayOrder: 1,
}

describe('OutcomeCard', () => {
  it('renders outcome code', () => {
    render(<OutcomeCard outcome={mockOutcome} />)

    expect(screen.getByText('MA3-RN-01')).toBeInTheDocument()
  })

  it('renders outcome description', () => {
    render(<OutcomeCard outcome={mockOutcome} />)

    expect(
      screen.getByText(/Compares and orders fractions/)
    ).toBeInTheDocument()
  })

  it('shows stage badge by default', () => {
    render(<OutcomeCard outcome={mockOutcome} />)

    expect(screen.getByText('S3')).toBeInTheDocument()
  })

  it('hides stage badge when showStage is false', () => {
    render(<OutcomeCard outcome={mockOutcome} showStage={false} />)

    expect(screen.queryByText('S3')).not.toBeInTheDocument()
  })

  it('shows strand when showStrand is true', () => {
    render(<OutcomeCard outcome={mockOutcome} showStrand={true} />)

    expect(screen.getByText('Number and Algebra')).toBeInTheDocument()
    expect(screen.getByText('Fractions and Decimals')).toBeInTheDocument()
  })

  it('hides strand when showStrand is false', () => {
    render(<OutcomeCard outcome={mockOutcome} showStrand={false} />)

    expect(screen.queryByText('Number and Algebra')).not.toBeInTheDocument()
  })

  it('shows prerequisites when present', () => {
    render(<OutcomeCard outcome={mockOutcome} />)

    expect(screen.getByText('MA2-RN-01, MA2-RN-02')).toBeInTheDocument()
  })

  it('renders as div when no onClick', () => {
    const { container } = render(<OutcomeCard outcome={mockOutcome} />)

    expect(container.querySelector('div')).toBeInTheDocument()
    expect(container.querySelector('button')).not.toBeInTheDocument()
  })

  it('renders as button when onClick provided', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <OutcomeCard outcome={mockOutcome} onClick={handleClick} />
    )

    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<OutcomeCard outcome={mockOutcome} onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders in compact mode', () => {
    render(<OutcomeCard outcome={mockOutcome} compact={true} />)

    // Prerequisites should be hidden in compact mode
    expect(screen.queryByText('Prerequisites:')).not.toBeInTheDocument()
    // Strand should be hidden in compact mode
    expect(screen.queryByText('Number and Algebra')).not.toBeInTheDocument()
  })

  it('shows pathway badge when present', () => {
    const outcomeWithPathway = { ...mockOutcome, pathway: '5.3' }
    render(<OutcomeCard outcome={outcomeWithPathway} />)

    expect(screen.getByText('5.3')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <OutcomeCard outcome={mockOutcome} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
