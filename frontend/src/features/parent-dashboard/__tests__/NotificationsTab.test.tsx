/**
 * Tests for NotificationsTab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsTab } from '../components/NotificationsTab';

// Mock the API
vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockNotifications = {
  notifications: [
    {
      id: 'notif-1',
      parentId: 'parent-1',
      studentId: 'student-1',
      type: 'milestone',
      title: 'New Milestone Reached!',
      message: 'Emma mastered 10 outcomes in Mathematics',
      data: { milestone: 'Mastered 10 outcomes' },
      readAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      parentId: 'parent-1',
      studentId: 'student-1',
      type: 'streak',
      title: 'Study Streak!',
      message: 'Emma has studied for 7 days in a row',
      data: { streakDays: 7 },
      readAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif-3',
      parentId: 'parent-1',
      studentId: 'student-1',
      type: 'goal_achieved',
      title: 'Goal Achieved!',
      message: 'Emma completed the multiplication goal',
      data: { goalTitle: 'Master Multiplication', reward: 'Pizza night!' },
      readAt: null,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif-4',
      parentId: 'parent-1',
      studentId: 'student-1',
      type: 'struggle_alert',
      title: 'Attention Needed',
      message: 'Emma is struggling with fractions',
      data: { subject: 'Mathematics', topic: 'Fractions' },
      readAt: null,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ],
  total: 4,
  unreadCount: 3,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('NotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parentDashboardApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue(mockNotifications);
  });

  describe('rendering', () => {
    it('shows loading state initially', () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays notifications after loading', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('New Milestone Reached!')).toBeInTheDocument();
        expect(screen.getByText('Study Streak!')).toBeInTheDocument();
      });
    });

    it('shows unread count in header', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('3 unread')).toBeInTheDocument();
      });
    });

    it('shows "All caught up!" when no unread notifications', async () => {
      (parentDashboardApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
        notifications: mockNotifications.notifications.map(n => ({ ...n, readAt: new Date().toISOString() })),
        total: 4,
        unreadCount: 0,
      });

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('All caught up!')).toBeInTheDocument();
      });
    });

    it('shows empty state when no notifications', async () => {
      (parentDashboardApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      });

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });
    });
  });

  describe('notification cards', () => {
    it('displays notification title and message', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('New Milestone Reached!')).toBeInTheDocument();
        expect(screen.getByText('Emma mastered 10 outcomes in Mathematics')).toBeInTheDocument();
      });
    });

    it('highlights unread notifications with blue border', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const cards = screen.getAllByText('New Milestone Reached!').map(el => el.closest('[class*="border-l-blue"]'));
        expect(cards[0]).toBeInTheDocument();
      });
    });

    it('displays notification type label', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Milestone')).toBeInTheDocument();
        expect(screen.getByText('Streak')).toBeInTheDocument();
      });
    });

    it('displays relative time for notifications', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        // Recent notifications should show relative time - look for any time indicator
        expect(screen.getAllByText(/now|ago|Just/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('notification data previews', () => {
    it('displays goal achievement data', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Goal: Master Multiplication/)).toBeInTheDocument();
        expect(screen.getByText(/Reward: Pizza night!/)).toBeInTheDocument();
      });
    });

    it('displays milestone data', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Mastered 10 outcomes')).toBeInTheDocument();
      });
    });

    it('displays struggle alert data', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Subject: Mathematics/)).toBeInTheDocument();
        expect(screen.getByText(/Topic: Fractions/)).toBeInTheDocument();
      });
    });

    it('displays streak data', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('7 day streak!')).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('has filter select with aria-label for accessibility', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const select = screen.getByLabelText('Filter notifications by type');
        expect(select).toBeInTheDocument();
      });
    });

    it('shows all notification type options', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'All Types' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Milestones' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Streaks' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Goals' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Alerts' })).toBeInTheDocument();
      });
    });

    it('filters notifications by type', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const select = screen.getByLabelText('Filter notifications by type');
        fireEvent.change(select, { target: { value: 'milestone' } });
      });

      await waitFor(() => {
        expect(screen.getByText('New Milestone Reached!')).toBeInTheDocument();
        expect(screen.queryByText('Study Streak!')).not.toBeInTheDocument();
      });
    });

    it('has unread-only checkbox with aria-label', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Show unread notifications only');
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('filters to unread only when checkbox checked', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Show unread notifications only');
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(parentDashboardApi.getNotifications).toHaveBeenCalledWith(
          expect.objectContaining({ unreadOnly: true })
        );
      });
    });
  });

  describe('mark as read functionality', () => {
    it('shows mark as read button for unread notifications', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const markReadButtons = screen.getAllByLabelText('Mark notification as read');
        expect(markReadButtons.length).toBeGreaterThan(0);
      });
    });

    it('marks individual notification as read when clicked', async () => {
      (parentDashboardApi.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        const markReadButtons = screen.getAllByLabelText('Mark notification as read');
        fireEvent.click(markReadButtons[0]);
      });

      await waitFor(() => {
        expect(parentDashboardApi.markNotificationRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('shows mark all as read button when unread exist', async () => {
      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Mark all as read')).toBeInTheDocument();
      });
    });

    it('marks all notifications as read when button clicked', async () => {
      (parentDashboardApi.markAllNotificationsRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Mark all as read'));
      });

      await waitFor(() => {
        expect(parentDashboardApi.markAllNotificationsRead).toHaveBeenCalled();
      });
    });

    it('does not show mark all as read when all are read', async () => {
      (parentDashboardApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
        notifications: mockNotifications.notifications.map(n => ({ ...n, readAt: new Date().toISOString() })),
        total: 4,
        unreadCount: 0,
      });

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('displays error message on API failure', async () => {
      (parentDashboardApi.getNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch notifications')
      );

      renderWithProviders(<NotificationsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch notifications')).toBeInTheDocument();
      });
    });
  });
});
