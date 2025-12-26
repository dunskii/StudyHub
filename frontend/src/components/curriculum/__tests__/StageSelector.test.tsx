import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StageSelector, NSW_STAGES } from '../StageSelector'

describe('StageSelector', () => {
  it('renders all NSW stages', () => {
    const handleChange = vi.fn()
    render(<StageSelector value={null} onChange={handleChange} />)

    NSW_STAGES.forEach((stage) => {
      expect(screen.getByText(stage.label)).toBeInTheDocument()
    })
  })

  it('shows year labels by default', () => {
    const handleChange = vi.fn()
    render(<StageSelector value={null} onChange={handleChange} />)

    expect(screen.getByText('Kindergarten')).toBeInTheDocument()
    expect(screen.getByText('Years 1-2')).toBeInTheDocument()
    expect(screen.getByText('Years 11-12')).toBeInTheDocument()
  })

  it('hides year labels when showYears is false', () => {
    const handleChange = vi.fn()
    render(
      <StageSelector value={null} onChange={handleChange} showYears={false} />
    )

    expect(screen.queryByText('Kindergarten')).not.toBeInTheDocument()
  })

  it('calls onChange with selected stage', () => {
    const handleChange = vi.fn()
    render(<StageSelector value={null} onChange={handleChange} />)

    fireEvent.click(screen.getByText('Stage 3'))
    expect(handleChange).toHaveBeenCalledWith('S3')
  })

  it('deselects when clicking already selected stage', () => {
    const handleChange = vi.fn()
    render(<StageSelector value="S3" onChange={handleChange} />)

    fireEvent.click(screen.getByText('Stage 3'))
    expect(handleChange).toHaveBeenCalledWith(null)
  })

  it('supports multiple selection', () => {
    const handleChange = vi.fn()
    render(
      <StageSelector value={['S1']} onChange={handleChange} multiple={true} />
    )

    fireEvent.click(screen.getByText('Stage 2'))
    expect(handleChange).toHaveBeenCalledWith(['S1', 'S2'])
  })

  it('removes from multiple selection when deselecting', () => {
    const handleChange = vi.fn()
    render(
      <StageSelector
        value={['S1', 'S2']}
        onChange={handleChange}
        multiple={true}
      />
    )

    fireEvent.click(screen.getByText('Stage 1'))
    expect(handleChange).toHaveBeenCalledWith(['S2'])
  })

  it('returns null when all deselected in multiple mode', () => {
    const handleChange = vi.fn()
    render(
      <StageSelector value={['S1']} onChange={handleChange} multiple={true} />
    )

    fireEvent.click(screen.getByText('Stage 1'))
    expect(handleChange).toHaveBeenCalledWith(null)
  })

  it('shows loading skeleton when loading', () => {
    const handleChange = vi.fn()
    const { container } = render(
      <StageSelector value={null} onChange={handleChange} loading={true} />
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(7)
  })

  it('disables interaction when disabled', () => {
    const handleChange = vi.fn()
    render(
      <StageSelector value={null} onChange={handleChange} disabled={true} />
    )

    fireEvent.click(screen.getByText('Stage 3'))
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('applies aria-pressed to selected stage', () => {
    const handleChange = vi.fn()
    render(<StageSelector value="S3" onChange={handleChange} />)

    const selectedButton = screen.getByText('Stage 3').closest('button')
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders in vertical orientation', () => {
    const handleChange = vi.fn()
    const { container } = render(
      <StageSelector
        value={null}
        onChange={handleChange}
        orientation="vertical"
      />
    )

    expect(container.firstChild).toHaveClass('flex-col')
  })
})
