import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders with default text', () => {
    render(<SkipLink targetId="main" />);

    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<SkipLink targetId="content">Skip to content</SkipLink>);

    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });

  it('has correct href attribute', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has sr-only class by default', () => {
    render(<SkipLink targetId="main" />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('sr-only');
  });

  it('focuses target element on click', () => {
    // Create a target element
    const targetElement = document.createElement('div');
    targetElement.id = 'main';
    targetElement.tabIndex = -1;
    // Mock scrollIntoView since jsdom doesn't implement it
    targetElement.scrollIntoView = vi.fn();
    document.body.appendChild(targetElement);

    const focusSpy = vi.spyOn(targetElement, 'focus');

    render(<SkipLink targetId="main" />);

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(focusSpy).toHaveBeenCalled();
    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    // Cleanup
    document.body.removeChild(targetElement);
  });

  it('applies custom className', () => {
    render(<SkipLink targetId="main" className="custom-class" />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});
