/**
 * Notification permission prompt component.
 * Asks users to enable push notifications for study reminders.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPromptProps {
  /** Callback when prompt is dismissed */
  onDismiss: () => void;
  /** Callback when permission is granted */
  onGranted?: () => void;
  /** Callback when permission is denied */
  onDenied?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Storage key for tracking if prompt was dismissed
const PROMPT_DISMISSED_KEY = 'studyhub:notification-prompt-dismissed';

/**
 * Check if notifications are supported in the current browser.
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get the current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Check if the notification prompt should be shown.
 */
export function shouldShowNotificationPrompt(): boolean {
  // Not supported
  if (!isNotificationSupported()) {
    return false;
  }

  // Already granted or denied
  if (Notification.permission !== 'default') {
    return false;
  }

  // User previously dismissed
  const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
  if (dismissed) {
    // Check if it's been more than 7 days since dismissal
    const dismissedAt = new Date(dismissed);
    const daysSinceDismissal =
      (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissal < 7) {
      return false;
    }
  }

  return true;
}

/**
 * Subscribe to push notifications.
 */
async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Get VAPID public key from environment
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('VAPID public key not configured');
      return null;
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Send subscription to backend
    await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
      }),
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

/**
 * Convert an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return window.btoa(binary);
}

/**
 * NotificationPrompt component.
 *
 * Shows a prompt asking users to enable push notifications.
 * Handles permission request and subscription.
 */
export const NotificationPrompt = memo(function NotificationPrompt({
  onDismiss,
  onGranted,
  onDenied,
  className,
}: NotificationPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, new Date().toISOString());
    onDismiss();
  }, [onDismiss]);

  const requestPermission = useCallback(async () => {
    setIsRequesting(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Subscribe to push
        await subscribeToPush();
        onGranted?.();
        onDismiss();
      } else if (permission === 'denied') {
        onDenied?.();
        onDismiss();
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  }, [onDismiss, onGranted, onDenied]);

  // Don't render if notifications not supported or already handled
  if (!shouldShowNotificationPrompt()) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="notification-prompt-title"
      aria-describedby="notification-prompt-description"
      className={cn(
        'fixed bottom-20 right-4 z-50 w-80 rounded-lg bg-white p-4 shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        aria-label="Dismiss notification prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-blue-100 p-2.5 dark:bg-blue-900">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 pt-0.5">
          <h3
            id="notification-prompt-title"
            className="font-semibold text-gray-900 dark:text-gray-100"
          >
            Stay on track
          </h3>
          <p
            id="notification-prompt-description"
            className="mt-1 text-sm text-gray-600 dark:text-gray-400"
          >
            Get reminders for study sessions and celebrate your achievements!
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={requestPermission}
              disabled={isRequesting}
              className={cn(
                'inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors',
                'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isRequesting ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Hook to manage notification prompt visibility.
 */
export function useNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Delay showing prompt to avoid interrupting user flow
    const timer = setTimeout(() => {
      setShowPrompt(shouldShowNotificationPrompt());
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return {
    showPrompt,
    dismissPrompt,
    permission: getNotificationPermission(),
    isSupported: isNotificationSupported(),
  };
}
