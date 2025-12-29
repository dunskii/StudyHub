/**
 * Tests for SyncStatus component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SyncStatus, SyncIndicator } from '../SyncStatus';

// Mock useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true, wasOffline: false })),
  useConnectivityEvents: vi.fn(),
}));

// Mock syncQueue functions
vi.mock('@/lib/offline/syncQueue', () => ({
  getPendingCount: vi.fn(() => Promise.resolve(0)),
  processSyncQueue: vi.fn(() => Promise.resolve({ success: 0, failed: 0, remaining: 0 })),
}));

import { useOnlineStatus, useConnectivityEvents } from '@/hooks/useOnlineStatus';
import { getPendingCount, processSyncQueue } from '@/lib/offline/syncQueue';

const mockUseOnlineStatus = useOnlineStatus as ReturnType<typeof vi.fn>;
const mockUseConnectivityEvents = useConnectivityEvents as ReturnType<typeof vi.fn>;
const mockGetPendingCount = getPendingCount as ReturnType<typeof vi.fn>;
const mockProcessSyncQueue = processSyncQueue as ReturnType<typeof vi.fn>;

describe('SyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false });
    mockUseConnectivityEvents.mockImplementation(() => {});
    mockGetPendingCount.mockResolvedValue(0);
    mockProcessSyncQueue.mockResolvedValue({ success: 0, failed: 0, remaining: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders synced state when no pending operations', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus showLabel />);

    await waitFor(() => {
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });
  });

  it('renders pending state when there are pending operations', async () => {
    mockGetPendingCount.mockResolvedValue(5);

    render(<SyncStatus showLabel />);

    await waitFor(() => {
      expect(screen.getByText('5 pending')).toBeInTheDocument();
    });
  });

  it('has correct role for accessibility', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('has aria-live for accessibility', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus />);

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('shows count badge when pending operations > 0', async () => {
    mockGetPendingCount.mockResolvedValue(3);

    render(<SyncStatus />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows 9+ for counts greater than 9', async () => {
    mockGetPendingCount.mockResolvedValue(15);

    render(<SyncStatus />);

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus className="custom-class" />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });

  it('shows title attribute with status information', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus />);

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('title', 'All changes saved');
    });
  });

  it('shows pending title when operations are waiting', async () => {
    mockGetPendingCount.mockResolvedValue(3);

    render(<SyncStatus />);

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('title', '3 changes waiting to sync');
    });
  });

  it('includes screen reader text', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    render(<SyncStatus />);

    await waitFor(() => {
      const srText = screen.getByText('All changes saved');
      expect(srText).toHaveClass('sr-only');
    });
  });
});

describe('SyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPendingCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no pending operations', async () => {
    mockGetPendingCount.mockResolvedValue(0);

    const { container } = render(<SyncIndicator />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders when there are pending operations', async () => {
    mockGetPendingCount.mockResolvedValue(5);

    const { container } = render(<SyncIndicator />);

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });

  it('shows count for pending operations', async () => {
    mockGetPendingCount.mockResolvedValue(3);

    render(<SyncIndicator />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows 9+ for counts greater than 9', async () => {
    mockGetPendingCount.mockResolvedValue(12);

    render(<SyncIndicator />);

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    mockGetPendingCount.mockResolvedValue(3);

    const { container } = render(<SyncIndicator className="custom-indicator" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-indicator');
    });
  });

  it('has title attribute', async () => {
    mockGetPendingCount.mockResolvedValue(5);

    const { container } = render(<SyncIndicator />);

    await waitFor(() => {
      expect(container.firstChild).toHaveAttribute('title', '5 pending');
    });
  });
});
