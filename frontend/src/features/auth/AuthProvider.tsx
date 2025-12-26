/**
 * AuthProvider - Manages authentication state with Supabase.
 *
 * Wraps the app to provide authentication context, handling:
 * - Supabase auth state changes
 * - Token refresh
 * - User profile loading from backend
 * - Active student selection
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { api, usersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { setUser, setLoading, logout: storeLogout } = useAuthStore();

  /**
   * Load the user profile from the backend API.
   */
  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const user = await usersApi.getCurrentUser();
      setUser(user);
    } catch (error) {
      // If user doesn't exist in backend yet (new signup), that's ok
      // They'll be created during the signup flow
      console.error('Failed to load user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  /**
   * Set up the API client with token provider.
   */
  useEffect(() => {
    // Configure API client to get token from Supabase session
    api.setTokenProvider(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    // Handle auth errors by signing out
    api.setAuthErrorHandler(() => {
      signOut();
    });
  }, []);

  /**
   * Initialize auth state and listen for changes.
   */
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          await loadUserProfile();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession) {
        await loadUserProfile();
      } else if (event === 'SIGNED_OUT') {
        storeLogout();
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        // Token was refreshed, profile should still be valid
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, storeLogout]);

  /**
   * Sign in with email and password.
   */
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /**
   * Sign up with email and password.
   * Creates both Supabase user and backend user.
   */
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    // Create Supabase user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Failed to create user');
    }

    // Create backend user
    try {
      await usersApi.create({
        supabase_auth_id: data.user.id,
        email,
        display_name: displayName,
      });
    } catch (apiError) {
      // If backend user creation fails, we should clean up the Supabase user
      // But Supabase doesn't allow deleting users from client, so log and continue
      console.error('Failed to create backend user:', apiError);
      throw new Error('Account created but profile setup failed. Please contact support.');
    }
  }, []);

  /**
   * Sign out.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
    }

    storeLogout();
  }, [storeLogout]);

  /**
   * Reset password.
   */
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const value: AuthContextValue = {
    session,
    supabaseUser,
    isLoading: isInitializing,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
