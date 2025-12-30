/**
 * SettingsTab - Settings panel for parent notification preferences.
 *
 * Features:
 * - Notification type toggles (achievements, concerns, goals, etc.)
 * - Email frequency settings
 * - Quiet hours configuration
 * - Timezone selection
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Mail,
  Clock,
  Save,
  Trophy,
  AlertTriangle,
  Target,
  Lightbulb,
  FileText,
  Trash2,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { NotificationPreferences, UpdateNotificationPreferencesRequest } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { DeleteAccountModal } from '@/features/auth/components/DeleteAccountModal';
import { DeletionPending } from '@/features/auth/components/DeletionPending';

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
  return { value: `${hour}:00`, label };
});

export function SettingsTab() {
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => parentDashboardApi.getNotificationPreferences(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreferences = useMutation({
    mutationFn: (data: UpdateNotificationPreferencesRequest) =>
      parentDashboardApi.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
        <p className="text-red-600">Failed to load settings</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
          <p className="text-sm text-gray-500">
            Manage how and when you receive notifications about your children's progress.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <Save className="h-4 w-4" />
            Settings saved
          </div>
        )}
      </div>

      {/* Notification Types */}
      <NotificationTypesSection
        preferences={preferences}
        onUpdate={(data) => updatePreferences.mutate(data)}
        isUpdating={updatePreferences.isPending}
      />

      {/* Email Settings */}
      <EmailSettingsSection
        preferences={preferences}
        onUpdate={(data) => updatePreferences.mutate(data)}
        isUpdating={updatePreferences.isPending}
      />

      {/* Quiet Hours */}
      <QuietHoursSection
        preferences={preferences}
        onUpdate={(data) => updatePreferences.mutate(data)}
        isUpdating={updatePreferences.isPending}
      />

      {/* Danger Zone */}
      <DangerZoneSection />
    </div>
  );
}

// =============================================================================
// Section Components
// =============================================================================

interface SectionProps {
  preferences: NotificationPreferences;
  onUpdate: (data: UpdateNotificationPreferencesRequest) => void;
  isUpdating: boolean;
}

function NotificationTypesSection({ preferences, onUpdate, isUpdating }: SectionProps) {
  const toggles = [
    {
      key: 'achievement_alerts' as const,
      label: 'Achievement Alerts',
      description: 'Get notified when your child earns badges, reaches milestones, or completes goals.',
      icon: Trophy,
      color: 'text-green-500',
      enabled: preferences.achievementAlerts,
    },
    {
      key: 'concern_alerts' as const,
      label: 'Concern Alerts',
      description: 'Receive alerts when your child may be struggling with a topic or has reduced activity.',
      icon: AlertTriangle,
      color: 'text-orange-500',
      enabled: preferences.concernAlerts,
    },
    {
      key: 'goal_reminders' as const,
      label: 'Goal Reminders',
      description: 'Get reminders about upcoming goal deadlines and progress updates.',
      icon: Target,
      color: 'text-blue-500',
      enabled: preferences.goalReminders,
    },
    {
      key: 'insight_notifications' as const,
      label: 'AI Insights',
      description: 'Receive notifications when new weekly insights are available.',
      icon: Lightbulb,
      color: 'text-purple-500',
      enabled: preferences.insightNotifications,
    },
    {
      key: 'weekly_reports' as const,
      label: 'Weekly Reports',
      description: 'Receive a weekly summary of your child\'s learning progress.',
      icon: FileText,
      color: 'text-indigo-500',
      enabled: preferences.weeklyReports,
    },
  ];

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">Notification Types</h3>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Choose which types of notifications you want to receive.
      </p>

      <div className="space-y-4">
        {toggles.map(({ key, label, description, icon: Icon, color, enabled }) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex gap-3">
              <div className={`mt-0.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <label
                  htmlFor={`toggle-${key}`}
                  className="font-medium text-gray-900 cursor-pointer"
                >
                  {label}
                </label>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              </div>
            </div>
            <button
              id={`toggle-${key}`}
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isUpdating}
              onClick={() => onUpdate({ [key]: !enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">
                {enabled ? 'Disable' : 'Enable'} {label}
              </span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmailSettingsSection({ preferences, onUpdate, isUpdating }: SectionProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">Email Preferences</h3>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Configure how often you receive email summaries and when you prefer to receive them.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Email Frequency */}
        <div>
          <label
            htmlFor="email-frequency"
            className="block text-sm font-medium text-gray-700"
          >
            Email Frequency
          </label>
          <select
            id="email-frequency"
            value={preferences.emailFrequency}
            onChange={(e) => onUpdate({ email_frequency: e.target.value })}
            disabled={isUpdating}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="never">Never</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            How often you receive email digests
          </p>
        </div>

        {/* Preferred Day */}
        {(preferences.emailFrequency === 'weekly' || preferences.emailFrequency === 'monthly') && (
          <div>
            <label
              htmlFor="preferred-day"
              className="block text-sm font-medium text-gray-700"
            >
              Preferred Day
            </label>
            <select
              id="preferred-day"
              value={preferences.preferredDay}
              onChange={(e) => onUpdate({ preferred_day: e.target.value })}
              disabled={isUpdating}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Day of the week to receive emails
            </p>
          </div>
        )}

        {/* Preferred Time */}
        <div>
          <label
            htmlFor="preferred-time"
            className="block text-sm font-medium text-gray-700"
          >
            Preferred Time
          </label>
          <select
            id="preferred-time"
            value={preferences.preferredTime}
            onChange={(e) => onUpdate({ preferred_time: e.target.value })}
            disabled={isUpdating}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          >
            {HOURS.map((hour) => (
              <option key={hour.value} value={hour.value}>
                {hour.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Time of day to receive emails
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700"
          >
            Timezone
          </label>
          <select
            id="timezone"
            value={preferences.timezone}
            onChange={(e) => onUpdate({ timezone: e.target.value })}
            disabled={isUpdating}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ').replace('/', ' - ')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Your local timezone for scheduling
          </p>
        </div>
      </div>
    </Card>
  );
}

function QuietHoursSection({ preferences, onUpdate, isUpdating }: SectionProps) {
  const hasQuietHours = preferences.quietHoursStart && preferences.quietHoursEnd;

  const handleToggleQuietHours = () => {
    if (hasQuietHours) {
      onUpdate({ quiet_hours_start: '', quiet_hours_end: '' });
    } else {
      onUpdate({ quiet_hours_start: '22:00', quiet_hours_end: '07:00' });
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Set hours when you don't want to receive push notifications.
      </p>

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Enable Quiet Hours</p>
            <p className="text-sm text-gray-500">
              Pause notifications during specified hours
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(hasQuietHours)}
            disabled={isUpdating}
            onClick={handleToggleQuietHours}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              hasQuietHours ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className="sr-only">
              {hasQuietHours ? 'Disable' : 'Enable'} quiet hours
            </span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                hasQuietHours ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Time Range */}
        {hasQuietHours && (
          <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="quiet-start"
                className="block text-sm font-medium text-gray-700"
              >
                Start Time
              </label>
              <select
                id="quiet-start"
                value={preferences.quietHoursStart ?? '22:00'}
                onChange={(e) => onUpdate({ quiet_hours_start: e.target.value })}
                disabled={isUpdating}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {HOURS.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="quiet-end"
                className="block text-sm font-medium text-gray-700"
              >
                End Time
              </label>
              <select
                id="quiet-end"
                value={preferences.quietHoursEnd ?? '07:00'}
                onChange={(e) => onUpdate({ quiet_hours_end: e.target.value })}
                disabled={isUpdating}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {HOURS.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function DangerZoneSection() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <Card className="border-red-200 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-medium text-red-700">Danger Zone</h3>
        </div>

        {/* Show pending deletion banner if applicable */}
        <DeletionPending variant="card" />

        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-red-800">Delete Account</p>
              <p className="mt-1 text-sm text-red-600">
                Permanently delete your account and all associated data, including all student profiles.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />
    </>
  );
}
