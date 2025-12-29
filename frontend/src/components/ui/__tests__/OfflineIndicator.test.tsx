/**
 * Tests for OfflineIndicator component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator, OfflineStatusBadge, OfflineFallback } from '../OfflineIndicator';

// Mock useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const mockUseOnlineStatus = useOnlineStatus as ReturnType<typeof vi.fn>;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when online and never been offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/cached data/i)).toBeInTheDocument();
  });

  it('renders syncing message when back online after being offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('has correct role for accessibility', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies position classes correctly', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    const { rerender } = render(<OfflineIndicator position="bottom" />);
    expect(screen.getByRole('status')).toHaveClass('bottom-4');

    rerender(<OfflineIndicator position="top" />);
    expect(screen.getByRole('status')).toHaveClass('top-4');
  });

  it('applies custom className', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});

describe('OfflineStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when online and never been offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
    });

    const { container } = render(<OfflineStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    const { container } = render(<OfflineStatusBadge />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('OfflineFallback', () => {
  beforeEach(() => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });
  });

  it('renders default title and message', () => {
    render(<OfflineFallback />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/requires an internet connection/i)).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(
      <OfflineFallback
        title="Custom Title"
        message="Custom message here"
      />
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom message here')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided and online', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
    });

    const onRetry = vi.fn();
    render(<OfflineFallback onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('does not render retry button when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      wasOffline: true,
    });

    const onRetry = vi.fn();
    render(<OfflineFallback onRetry={onRetry} />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('has correct role for accessibility', () => {
    render(<OfflineFallback />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
