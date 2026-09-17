import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

export type { UserRole };

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  setUser: (user: User, token?: string) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

// --- LOCAL DEV USER (Default active profile) ---
export const DEFAULT_DEV_USER: User = {
  id: '385ca672-ef17-4ff3-a2f2-ae2077b4feb5',
  email: 'nishantshetty321@gmail.com',
  full_name: 'Nishant Shetty',
  role: 'authority',
  department: 'Ministry of Housing and Urban Affairs',
  phone: '+919876543210',
  trust_score: 100,
  language: 'en',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // --- ORIGINAL PROD DEFAULT (COMMENTED OUT FOR LOCAL DEV) ---
      // user: null,
      // token: null,
      // isLoggedIn: false,

      // --- LOCAL DEV DEFAULT ---
      user: DEFAULT_DEV_USER,
      token: 'dev-bypass-token',
      isLoggedIn: true,

      setUser: (user: User, token?: string) =>
        set({ user, token: token ?? 'dev-bypass-token', isLoggedIn: true }),
      setRole: (role: UserRole) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : { ...DEFAULT_DEV_USER, role },
        })),
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
