import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubjectCard } from '../SubjectCard'
import type { Subject } from '@/types/subject.types'

const mockSubject: Subject = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Mathematics',
  code: 'MATH',
  kla: 'Mathematics',
  description: 'Develops numeracy and mathematical thinking skills',
  icon: 'calculator',
  color: '#3B82F6',
  availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  frameworkId: '123e4567-e89b-12d3-a456-426614174001',
  displayOrder: 1,
  isActive: true,
  config: {
    hasPathways: true,
    pathways: ['5.1', '5.2', '5.3'],
    seniorCourses: ['MATH-STD', 'MATH-ADV', 'MATH-EXT1', 'MATH-EXT2'],
    assessmentTypes: ['test', 'assignment'],
    tutorStyle: 'socratic_stepwise',
  },
}

describe('SubjectCard', () => {
  it('renders subject name', () => {
    render(<SubjectCard subject={mockSubject} />)

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
  })

  it('renders as a button', () => {
    const { container } = render(<SubjectCard subject={mockSubject} />)

    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<SubjectCard subject={mockSubject} onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows selected state', () => {
    render(<SubjectCard subject={mockSubject} selected={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows disabled state', () => {
    render(<SubjectCard subject={mockSubject} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders subject icon', () => {
    const { container } = render(<SubjectCard subject={mockSubject} />)

    // Icon is rendered as a Lucide SVG icon
    const svgIcon = container.querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders description in large size', () => {
    render(<SubjectCard subject={mockSubject} size="lg" />)

    expect(
      screen.getByText('Develops numeracy and mathematical thinking skills')
    ).toBeInTheDocument()
  })

  it('hides description in medium size', () => {
    render(<SubjectCard subject={mockSubject} size="md" />)

    expect(
      screen.queryByText('Develops numeracy and mathematical thinking skills')
    ).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SubjectCard subject={mockSubject} className="custom-class" />
    )

    expect(container.querySelector('button')).toHaveClass('custom-class')
  })

  it('renders with small size', () => {
    render(<SubjectCard subject={mockSubject} size="sm" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('p-3')
  })

  it('renders with large size', () => {
    render(<SubjectCard subject={mockSubject} size="lg" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('p-6')
  })
})
