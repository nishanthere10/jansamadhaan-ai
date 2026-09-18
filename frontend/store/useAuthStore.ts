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

/** True only in local development builds — production never pre-authenticates. */
const isDev = import.meta.env.DEV === true;

// --- LOCAL DEV USER (instant-login helper; never used as a default session) ---
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

/** Dev-only instant-login profiles. Exported for the dev-only Login panel. */
export const DEV_USERS: Record<'authority' | 'citizen' | 'worker', User> = {
  authority: DEFAULT_DEV_USER,
  citizen: {
    id: '0cc48132-66d1-4231-af22-c142192006e5',
    email: 'ganeshshetty621976@gmail.com',
    full_name: 'Ganesh Shetty (Citizen)',
    role: 'citizen',
    phone: '+919876543211',
    trust_score: 85,
    language: 'en',
  },
  worker: {
    id: 'bf1ffc54-5145-4f24-bba8-ff5ebf8936f3',
    email: 'meinhusinger12@gmail.com',
    full_name: 'Ravi Kumar (Worker)',
    role: 'worker',
    department: 'Public Works (PWD)',
    phone: '+919876543212',
    trust_score: 90,
    language: 'en',
  },
};

export const DEV_TOKENS: Record<'authority' | 'citizen' | 'worker', string> = {
  authority: 'dev-authority-token',
  citizen: 'dev-citizen-token',
  worker: 'dev-worker-token',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Production default: logged out. Dev instant-login sets a session
      // explicitly via setUser (Login page, dev-only panel).
      user: null,
      token: null,
      isLoggedIn: false,

      setUser: (user: User, token?: string) =>
        set({ user: token ? user : null, token: token ?? null, isLoggedIn: Boolean(token) }),
      setRole: (role: UserRole) =>
        set((state) => ({
          user: isDev && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' && state.user
            ? { ...state.user, role } : state.user,
        })),
      logout: () => set({ user: null, token: null, isLoggedIn: false }),
    }),
    {
      name: 'civicresponse-auth',
      version: 2,
      migrate: () => ({ user: null, token: null, isLoggedIn: false }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
