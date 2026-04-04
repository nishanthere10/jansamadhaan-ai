import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LANGUAGE } from '../lib/languages';

interface LanguageState {
  language: string;
  setLanguage: (code: string) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (code: string) => {
        document.documentElement.lang = code;
        set({ language: code });
      },
    }),
    {
      name: 'jansamadhan-lang',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
