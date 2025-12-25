import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />);
    expect(screen.getByPlaceholderText('Disabled input')).toBeDisabled();
  });

  it('accepts different types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="Number" />);
    expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports required attribute', () => {
    render(<Input required placeholder="Required" />);
    expect(screen.getByPlaceholderText('Required')).toBeRequired();
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('shows error message with role="alert"', () => {
      render(<Input error="This field is required" />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('This field is required');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input error="Invalid input" placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-invalid when hasError is true', () => {
      render(<Input hasError placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('links error message via aria-describedby', () => {
      render(<Input id="email" error="Invalid email" placeholder="Email" />);

      const input = screen.getByPlaceholderText('Email');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toContain('email-error');
    });

    it('shows hint text when no error', () => {
      render(<Input hint="Enter your email address" placeholder="Email" />);

      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('hides hint when error is present', () => {
      render(
        <Input
          hint="Enter your email"
          error="Email is required"
          placeholder="Email"
        />
      );

      expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('links hint via aria-describedby', () => {
      render(<Input id="username" hint="Choose a unique username" placeholder="Username" />);

      const input = screen.getByPlaceholderText('Username');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('username-hint');
    });
  });
});
