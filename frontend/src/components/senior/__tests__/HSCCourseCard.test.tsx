import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HSCCourseCard } from '../HSCCourseCard'
import type { SeniorCourse } from '@/types/curriculum.types'

const mockCourse: SeniorCourse = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Mathematics Extension 2',
  code: 'MATH-EXT2',
  description:
    'Advanced mathematics course for students seeking deep understanding',
  units: 2,
  isAtar: true,
  atarCategory: 'A',
  courseType: 'Extension',
  isExtension: true,
  isVET: false,
  prerequisites: ['Mathematics Extension 1'],
  subjectId: 'sub-1',
  frameworkId: 'fw-1',
  isActive: true,
}

describe('HSCCourseCard', () => {
  it('renders course name', () => {
    render(<HSCCourseCard course={mockCourse} />)

    expect(screen.getByText('Mathematics Extension 2')).toBeInTheDocument()
  })

  it('renders course code', () => {
    render(<HSCCourseCard course={mockCourse} />)

    expect(screen.getByText('MATH-EXT2')).toBeInTheDocument()
  })

  it('shows units badge', () => {
    render(<HSCCourseCard course={mockCourse} />)

    expect(screen.getByText('2 units')).toBeInTheDocument()
  })

  it('shows singular unit for 1 unit course', () => {
    const oneUnitCourse = { ...mockCourse, units: 1 }
    render(<HSCCourseCard course={oneUnitCourse} />)

    expect(screen.getByText('1 unit')).toBeInTheDocument()
  })

  it('shows ATAR category badge', () => {
    render(<HSCCourseCard course={mockCourse} />)

    expect(screen.getByText('ATAR A')).toBeInTheDocument()
  })

  it('shows course type badge', () => {
    render(<HSCCourseCard course={mockCourse} />)

    // There are multiple "Extension" elements - use getAllByText
    const extensionElements = screen.getAllByText('Extension')
    expect(extensionElements.length).toBeGreaterThan(0)
  })

  it('shows extension indicator', () => {
    render(<HSCCourseCard course={mockCourse} />)

    // The extension indicator is shown in the metadata
    const extensionElements = screen.getAllByText('Extension')
    expect(extensionElements.length).toBeGreaterThan(0)
  })

  it('shows VET indicator when applicable', () => {
    const vetCourse = { ...mockCourse, isVET: true, isExtension: false, courseType: 'VET' }
    render(<HSCCourseCard course={vetCourse} />)

    // VET appears in both the course type badge and metadata
    const vetElements = screen.getAllByText('VET')
    expect(vetElements.length).toBeGreaterThan(0)
  })

  it('shows prerequisites when showPrerequisites is true', () => {
    render(<HSCCourseCard course={mockCourse} showPrerequisites={true} />)

    expect(screen.getByText('Mathematics Extension 1')).toBeInTheDocument()
  })

  it('hides prerequisites in compact mode', () => {
    render(<HSCCourseCard course={mockCourse} compact={true} />)

    expect(
      screen.queryByText('Mathematics Extension 1')
    ).not.toBeInTheDocument()
  })

  it('renders as div when no onClick', () => {
    const { container } = render(<HSCCourseCard course={mockCourse} />)

    expect(container.querySelector('div')).toBeInTheDocument()
    expect(container.querySelector('button')).not.toBeInTheDocument()
  })

  it('renders as button when onClick provided', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <HSCCourseCard course={mockCourse} onClick={handleClick} />
    )

    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<HSCCourseCard course={mockCourse} onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    const { container } = render(
      <HSCCourseCard course={mockCourse} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
