/**
 * Tests for AuthGuard and GuestGuard components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '../AuthGuard';
import type { Student } from '@/types/student.types';

// Mock student
const mockStudent: Student = {
  id: 'student-1',
  parentId: 'parent-1',
  displayName: 'Test Student',
  gradeLevel: 5,
  schoolStage: 'S3',
  frameworkId: 'nsw',
  onboardingCompleted: true,
  preferences: {
    theme: 'auto',
    studyReminders: true,
    dailyGoalMinutes: 30,
    language: 'en-AU',
  },
  gamification: {
    totalXP: 100,
    level: 1,
    achievements: [],
    streaks: { current: 0, longest: 0 },
  },
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock auth context
const mockAuthContext = {
  session: null as object | null,
  isLoading: false,
};

vi.mock('../AuthProvider', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock auth store
const mockAuthStore = {
  isAuthenticated: false,
  isLoading: false,
  activeStudent: null as Student | null,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    // Reset mocks
    mockAuthContext.session = null;
    mockAuthContext.isLoading = false;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;
    mockAuthStore.activeStudent = null;
  });

  it('shows loading spinner while checking auth', () => {
    mockAuthContext.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <div>Protected Content</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthContext.session = { user: { id: 'user-1' } };
    mockAuthStore.isAuthenticated = true;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to select-student when student required but not selected', () => {
    mockAuthContext.session = { user: { id: 'user-1' } };
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.activeStudent = null;

    render(
      <MemoryRouter initialEntries={['/lesson']}>
        <Routes>
          <Route
            path="/lesson"
            element={
              <AuthGuard requireStudent>
                <div>Lesson Content</div>
              </AuthGuard>
            }
          />
          <Route path="/select-student" element={<div>Select Student</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Select Student')).toBeInTheDocument();
    expect(screen.queryByText('Lesson Content')).not.toBeInTheDocument();
  });

  it('renders children when student is selected and required', () => {
    mockAuthContext.session = { user: { id: 'user-1' } };
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.activeStudent = mockStudent;

    render(
      <MemoryRouter initialEntries={['/lesson']}>
        <AuthGuard requireStudent>
          <div>Lesson Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Lesson Content')).toBeInTheDocument();
  });

  it('uses custom redirect path', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthGuard redirectTo="/custom-login">
                <div>Protected Content</div>
              </AuthGuard>
            }
          />
          <Route path="/custom-login" element={<div>Custom Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Custom Login')).toBeInTheDocument();
  });
});

describe('GuestGuard', () => {
  beforeEach(() => {
    mockAuthContext.session = null;
    mockAuthContext.isLoading = false;
  });

  it('shows loading spinner while checking auth', () => {
    mockAuthContext.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <GuestGuard>
          <div>Login Form</div>
        </GuestGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
  });

  it('renders children when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <GuestGuard>
          <div>Login Form</div>
        </GuestGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  it('redirects to dashboard when authenticated', () => {
    mockAuthContext.session = { user: { id: 'user-1' } };

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestGuard>
                <div>Login Form</div>
              </GuestGuard>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
  });

  it('uses custom redirect path', () => {
    mockAuthContext.session = { user: { id: 'user-1' } };

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestGuard redirectTo="/home">
                <div>Login Form</div>
              </GuestGuard>
            }
          />
          <Route path="/home" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });
});
