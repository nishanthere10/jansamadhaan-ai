import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggleTheme: () => {
        const next = !get().isDark;
        set({ isDark: next });
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }),
    { name: 'civicresponse-theme' }
  )
);

// Initialize theme on load
export function initTheme() {
  const stored = localStorage.getItem('civicresponse-theme');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.isDark) {
      document.documentElement.classList.add('dark');
    }
  }
}
