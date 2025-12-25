import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Student } from '@/types/student.types'

interface AuthState {
  user: User | null
  activeStudent: Student | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setActiveStudent: (student: Student | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeStudent: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          activeStudent: user?.students[0] ?? null,
        }),
      setActiveStudent: (student) => set({ activeStudent: student }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          activeStudent: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'studyhub-auth',
      partialize: (state) => ({
        user: state.user,
        activeStudent: state.activeStudent,
      }),
    }
  )
)
