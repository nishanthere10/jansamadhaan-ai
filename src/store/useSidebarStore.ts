import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleCollapse: () => set({ isCollapsed: !get().isCollapsed }),
      setMobileOpen: (open: boolean) => set({ isMobileOpen: open }),
    }),
    {
      name: 'civicresponse-sidebar',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);
