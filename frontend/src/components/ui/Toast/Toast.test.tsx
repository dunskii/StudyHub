import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
} from './Toast';

// Helper to render toast within provider
const renderWithProvider = (children: React.ReactNode) => {
  return render(
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
};

describe('Toast Components', () => {
  it('renders ToastViewport', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="viewport" />
      </ToastProvider>
    );

    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  it('renders Toast with title and description', () => {
    renderWithProvider(
      <Toast open={true}>
        <ToastTitle>Success!</ToastTitle>
        <ToastDescription>Your changes have been saved.</ToastDescription>
      </Toast>
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
  });

  it('renders Toast with default variant', () => {
    renderWithProvider(
      <Toast open={true} data-testid="toast">
        <ToastTitle>Default Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('bg-background');
  });

  it('renders Toast with success variant', () => {
    renderWithProvider(
      <Toast open={true} variant="success" data-testid="toast">
        <ToastTitle>Success Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-green-500');
  });

  it('renders Toast with destructive variant', () => {
    renderWithProvider(
      <Toast open={true} variant="destructive" data-testid="toast">
        <ToastTitle>Error Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('destructive');
  });

  it('renders Toast with warning variant', () => {
    renderWithProvider(
      <Toast open={true} variant="warning" data-testid="toast">
        <ToastTitle>Warning Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-yellow-500');
  });

  it('renders Toast with info variant', () => {
    renderWithProvider(
      <Toast open={true} variant="info" data-testid="toast">
        <ToastTitle>Info Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-blue-500');
  });

  it('renders ToastAction button', () => {
    renderWithProvider(
      <Toast open={true}>
        <ToastTitle>Action Toast</ToastTitle>
        <ToastAction altText="Undo action">Undo</ToastAction>
      </Toast>
    );

    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('renders ToastClose button', () => {
    renderWithProvider(
      <Toast open={true}>
        <ToastTitle>Closeable Toast</ToastTitle>
        <ToastClose data-testid="close-btn" />
      </Toast>
    );

    expect(screen.getByTestId('close-btn')).toBeInTheDocument();
  });

  it('applies custom className to Toast', () => {
    renderWithProvider(
      <Toast open={true} className="custom-toast-class" data-testid="toast">
        <ToastTitle>Custom Toast</ToastTitle>
      </Toast>
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('custom-toast-class');
  });
});
