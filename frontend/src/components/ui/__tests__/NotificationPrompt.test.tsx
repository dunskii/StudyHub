/**
 * Tests for NotificationPrompt component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  NotificationPrompt,
  isNotificationSupported,
  getNotificationPermission,
  shouldShowNotificationPrompt,
} from '../NotificationPrompt';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(() => Promise.resolve('granted' as NotificationPermission)),
};

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
  configurable: true,
});

// Mock serviceWorker
const mockServiceWorker = {
  ready: Promise.resolve({
    pushManager: {
      getSubscription: vi.fn(() => Promise.resolve(null)),
      subscribe: vi.fn(() =>
        Promise.resolve({
          endpoint: 'https://test.push.endpoint',
          getKey: vi.fn(() => new ArrayBuffer(0)),
        })
      ),
    },
  }),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
  configurable: true,
});

// Mock fetch for push subscription
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as any;

describe('isNotificationSupported', () => {
  it('returns true when Notification and serviceWorker are available', () => {
    expect(isNotificationSupported()).toBe(true);
  });

  it('returns false when Notification is not available', () => {
    const originalNotification = window.Notification;
    // @ts-ignore
    delete window.Notification;

    expect(isNotificationSupported()).toBe(false);

    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });
});

describe('getNotificationPermission', () => {
  beforeEach(() => {
    mockNotification.permission = 'default';
  });

  it('returns current permission when notifications are supported', () => {
    mockNotification.permission = 'granted';
    expect(getNotificationPermission()).toBe('granted');
  });

  it('returns "unsupported" when notifications are not available', () => {
    const originalNotification = window.Notification;
    // @ts-ignore
    delete window.Notification;

    expect(getNotificationPermission()).toBe('unsupported');

    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });
});

describe('shouldShowNotificationPrompt', () => {
  beforeEach(() => {
    mockNotification.permission = 'default';
    mockLocalStorage.clear();
  });

  it('returns true when permission is default and not dismissed', () => {
    expect(shouldShowNotificationPrompt()).toBe(true);
  });

  it('returns false when permission is already granted', () => {
    mockNotification.permission = 'granted';
    expect(shouldShowNotificationPrompt()).toBe(false);
  });

  it('returns false when permission is denied', () => {
    mockNotification.permission = 'denied';
    expect(shouldShowNotificationPrompt()).toBe(false);
  });

  it('returns false when recently dismissed', () => {
    mockLocalStorage.setItem(
      'studyhub:notification-prompt-dismissed',
      new Date().toISOString()
    );
    expect(shouldShowNotificationPrompt()).toBe(false);
  });

  it('returns true when dismissed more than 7 days ago', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    mockLocalStorage.setItem(
      'studyhub:notification-prompt-dismissed',
      eightDaysAgo.toISOString()
    );
    expect(shouldShowNotificationPrompt()).toBe(true);
  });
});

describe('NotificationPrompt', () => {
  const defaultProps = {
    onDismiss: vi.fn(),
    onGranted: vi.fn(),
    onDenied: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotification.permission = 'default';
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when notifications are supported and permission is default', () => {
    render(<NotificationPrompt {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Stay on track')).toBeInTheDocument();
  });

  it('renders nothing when permission is already granted', () => {
    mockNotification.permission = 'granted';

    const { container } = render(<NotificationPrompt {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when permission is denied', () => {
    mockNotification.permission = 'denied';

    const { container } = render(<NotificationPrompt {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('has correct accessibility attributes', () => {
    render(<NotificationPrompt {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'notification-prompt-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'notification-prompt-description');
  });

  it('calls onDismiss when "Not now" is clicked', () => {
    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByText('Not now'));

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when close button is clicked', () => {
    render(<NotificationPrompt {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stores dismissal in localStorage when dismissed', () => {
    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByText('Not now'));

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'studyhub:notification-prompt-dismissed',
      expect.any(String)
    );
  });

  it('shows Enable button', () => {
    render(<NotificationPrompt {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(<NotificationPrompt {...defaultProps} />);

    expect(
      screen.getByText(/Get reminders for study sessions/)
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NotificationPrompt {...defaultProps} className="custom-prompt" />);

    expect(screen.getByRole('dialog')).toHaveClass('custom-prompt');
  });

  it('requests permission when Enable is clicked', async () => {
    mockNotification.requestPermission.mockResolvedValue('granted');

    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });
  });

  it('calls onGranted when permission is granted', async () => {
    mockNotification.requestPermission.mockResolvedValue('granted');

    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(defaultProps.onGranted).toHaveBeenCalled();
      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });
  });

  it('calls onDenied when permission is denied', async () => {
    mockNotification.requestPermission.mockResolvedValue('denied');

    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(defaultProps.onDenied).toHaveBeenCalled();
      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });
  });

  it('shows loading state while requesting permission', async () => {
    // Make the permission request hang
    mockNotification.requestPermission.mockImplementation(
      () => new Promise(() => {})
    );

    render(<NotificationPrompt {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(screen.getByText('Enabling...')).toBeInTheDocument();
    });
  });

  it('disables button while requesting permission', async () => {
    mockNotification.requestPermission.mockImplementation(
      () => new Promise(() => {})
    );

    render(<NotificationPrompt {...defaultProps} />);

    const enableButton = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enabling...' })).toBeDisabled();
    });
  });
});
