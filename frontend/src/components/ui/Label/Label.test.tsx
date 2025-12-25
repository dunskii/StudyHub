import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
  it('renders with text content', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email-input">Email</Label>
        <input id="email-input" type="email" />
      </>
    );

    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('applies custom className', () => {
    render(<Label className="custom-label">Custom</Label>);
    expect(screen.getByText('Custom')).toHaveClass('custom-label');
  });

  it('has correct base styles', () => {
    render(<Label>Styled Label</Label>);
    expect(screen.getByText('Styled Label')).toHaveClass('text-sm', 'font-medium');
  });

  it('applies disabled peer styles when appropriate', () => {
    render(<Label>Label with peer styles</Label>);
    const label = screen.getByText('Label with peer styles');
    // Label should have the peer-disabled class for styling
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
  });
});
