/**
 * AuthGuard - Protects routes that require authentication.
 *
 * Redirects to login page if user is not authenticated.
 * Optionally requires a student to be selected.
 */

import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';

interface AuthGuardProps {
  children: ReactNode;
  requireStudent?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireStudent = false,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { session, isLoading: authLoading } = useAuth();
  const { isAuthenticated, isLoading: storeLoading, activeStudent } = useAuthStore();
  const location = useLocation();

  const isLoading = authLoading || storeLoading;

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!session || !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authenticated but no student selected when required
  if (requireStudent && !activeStudent) {
    return <Navigate to="/select-student" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface GuestGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * GuestGuard - Protects routes that should only be accessible to guests.
 *
 * Redirects authenticated users to the dashboard.
 */
export function GuestGuard({ children, redirectTo = '/dashboard' }: GuestGuardProps) {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Authenticated - redirect to dashboard or previous location
  if (session) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
