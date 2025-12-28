/**
 * NotificationsTab - Notification centre for parent alerts.
 *
 * Features:
 * - List of notifications (unread and read)
 * - Mark as read / mark all as read
 * - Filter by type
 * - Link to relevant sections
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  Trophy,
  Lightbulb,
  Calendar,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { Notification } from '@/lib/api';
import { Card, Button, Spinner } from '@/components/ui';

type NotificationType =
  | 'all'
  | 'milestone'
  | 'streak'
  | 'goal_achieved'
  | 'struggle_alert'
  | 'weekly_summary'
  | 'insight';

interface NotificationsTabProps {
  studentId: string | null;
}

export function NotificationsTab({ studentId: _studentId }: NotificationsTabProps) {
  const [filter, setFilter] = useState<NotificationType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', showUnreadOnly],
    queryFn: () =>
      parentDashboardApi.getNotifications({
        unreadOnly: showUnreadOnly,
        pageSize: 50,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes (notifications should be more responsive)
  });

  const markAsRead = useMutation({
    mutationFn: (notificationId: string) =>
      parentDashboardApi.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => parentDashboardApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load notifications</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </Card>
    );
  }

  const allNotifications = notificationsData?.notifications ?? [];
  const filteredNotifications =
    filter === 'all'
      ? allNotifications
      : allNotifications.filter((n: Notification) => n.type === filter);

  const unreadCount = allNotifications.filter((n: Notification) => !n.readAt).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            aria-label="Filter notifications by type"
            value={filter}
            onChange={(e) => setFilter(e.target.value as NotificationType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="milestone">Milestones</option>
            <option value="streak">Streaks</option>
            <option value="goal_achieved">Goals</option>
            <option value="struggle_alert">Alerts</option>
            <option value="weekly_summary">Weekly Summary</option>
            <option value="insight">Insights</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            aria-label="Show unread notifications only"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Unread only
        </label>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification: Notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={() => markAsRead.mutate(notification.id)}
              isMarking={markAsRead.isPending && markAsRead.variables === notification.id}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications</h3>
          <p className="mt-2 text-gray-500">
            {showUnreadOnly
              ? "You're all caught up! No unread notifications."
              : "You haven't received any notifications yet."}
          </p>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: () => void;
  isMarking: boolean;
}

function NotificationCard({ notification, onMarkRead, isMarking }: NotificationCardProps) {
  const isUnread = !notification.readAt;
  const { icon: Icon, color, bgColor } = getNotificationStyle(notification.type);

  return (
    <Card
      className={`p-4 transition-all ${
        isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
      }`}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
            </div>
            {isUnread && (
              <button
                onClick={onMarkRead}
                disabled={isMarking}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                title="Mark as read"
                aria-label="Mark notification as read"
              >
                {isMarking ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Meta */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatTimeAgo(notification.createdAt)}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-500">
              {getNotificationTypeLabel(notification.type)}
            </span>
          </div>

          {/* Data preview if available */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <NotificationDataPreview data={notification.data} type={notification.type} />
          )}
        </div>
      </div>
    </Card>
  );
}

interface NotificationDataPreviewProps {
  data: Record<string, unknown>;
  type: string;
}

function NotificationDataPreview({ data, type }: NotificationDataPreviewProps) {
  // Render type-specific data previews
  const goalTitle = data.goalTitle ?? data.goal_title;
  const reward = data.reward;
  const milestone = data.milestone;
  const subject = data.subject;
  const topic = data.topic;
  const streakDays = data.streakDays ?? data.streak_days;

  if (type === 'goal_achieved' && goalTitle) {
    return (
      <div className="mt-3 rounded-lg bg-green-50 p-2 text-sm text-green-700">
        <Trophy className="mr-1 inline h-4 w-4" />
        Goal: {String(goalTitle)}
        {reward ? <span className="ml-2 text-green-600">Reward: {String(reward)}</span> : null}
      </div>
    );
  }

  if (type === 'milestone' && milestone) {
    return (
      <div className="mt-3 rounded-lg bg-purple-50 p-2 text-sm text-purple-700">
        <Target className="mr-1 inline h-4 w-4" />
        {String(milestone)}
      </div>
    );
  }

  if (type === 'struggle_alert' && subject) {
    return (
      <div className="mt-3 rounded-lg bg-orange-50 p-2 text-sm text-orange-700">
        <AlertTriangle className="mr-1 inline h-4 w-4" />
        Subject: {String(subject)}
        {topic ? <span className="ml-2">Topic: {String(topic)}</span> : null}
      </div>
    );
  }

  if (type === 'streak' && streakDays) {
    return (
      <div className="mt-3 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-700">
        <TrendingUp className="mr-1 inline h-4 w-4" />
        {String(streakDays)} day streak!
      </div>
    );
  }

  return null;
}

// =============================================================================
// Helpers
// =============================================================================

function getNotificationStyle(type: string): {
  icon: typeof Bell;
  color: string;
  bgColor: string;
} {
  switch (type) {
    case 'milestone':
      return { icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-100' };
    case 'streak':
      return { icon: TrendingUp, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'goal_achieved':
      return { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'struggle_alert':
      return { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' };
    case 'weekly_summary':
      return { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'insight':
      return { icon: Lightbulb, color: 'text-indigo-600', bgColor: 'bg-indigo-100' };
    default:
      return { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
}

function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    milestone: 'Milestone',
    streak: 'Streak',
    goal_achieved: 'Goal',
    struggle_alert: 'Alert',
    weekly_summary: 'Summary',
    insight: 'Insight',
  };
  return labels[type] ?? 'Notification';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}
