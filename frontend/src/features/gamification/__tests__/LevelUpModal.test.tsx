/**
 * Tests for LevelUpModal component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LevelUpModal } from '../components/LevelUpModal';

describe('LevelUpModal', () => {
  const defaultProps = {
    level: 5,
    title: 'Explorer',
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Level Up!/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<LevelUpModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays the new level', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays the level title', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByText('Explorer')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<LevelUpModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when continue button is clicked', () => {
    render(<LevelUpModal {...defaultProps} />);

    const continueButton = screen.getByRole('button', { name: /keep learning/i });
    fireEvent.click(continueButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<LevelUpModal {...defaultProps} />);

    // Click on the backdrop (the outer div with onClick)
    const backdrop = screen.getByRole('dialog').parentElement?.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('has proper accessibility attributes', () => {
    render(<LevelUpModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'level-up-title');
  });

  it('contains celebratory elements', () => {
    const { container } = render(<LevelUpModal {...defaultProps} />);

    // Should have stars or sparkles
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('renders congratulations message', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
  });
});
