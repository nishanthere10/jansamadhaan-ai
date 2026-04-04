import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

export type { UserRole };

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  setUser: (user: User, token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      setUser: (user: User, token?: string) =>
        set({ user, token: token ?? null, isLoggedIn: true }),
      logout: () => set({ user: null, token: null, isLoggedIn: false }),
    }),
    {
      name: 'civicresponse-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
