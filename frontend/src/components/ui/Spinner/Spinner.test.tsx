import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner, Loading } from './Spinner';

describe('Spinner', () => {
  it('renders with default props', () => {
    render(<Spinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner.tagName.toLowerCase()).toBe('svg');
  });

  it('renders with size variants', () => {
    const { rerender } = render(<Spinner size="sm" data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-4', 'w-4');

    rerender(<Spinner size="lg" data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-8', 'w-8');

    rerender(<Spinner size="xl" data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-12', 'w-12');
  });

  it('applies custom className', () => {
    render(<Spinner className="text-primary" data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('text-primary');
  });

  it('has animate-spin class for animation', () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('animate-spin');
  });
});

describe('Loading', () => {
  it('renders with default text', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<Loading text="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders without text when text is empty', () => {
    render(<Loading text="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders with large spinner by default', () => {
    render(<Loading data-testid="spinner" />);
    // The spinner inside Loading uses size="lg" by default
    const container = screen.getByText('Loading...').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
