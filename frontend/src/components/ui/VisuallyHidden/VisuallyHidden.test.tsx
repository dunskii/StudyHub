import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders children', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);

    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('renders with Radix VisuallyHidden wrapper', () => {
    const { container } = render(<VisuallyHidden>Hidden text</VisuallyHidden>);

    // Radix VisuallyHidden wraps content in a span
    const wrapper = container.firstChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.textContent).toBe('Hidden text');
  });

  it('works with asChild prop', () => {
    render(
      <VisuallyHidden asChild>
        <span data-testid="child">Child element</span>
      </VisuallyHidden>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
