import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSidebarStore } from '../../store/useSidebarStore';
import { Navbar } from './Navbar';
import { Sidebar, MobileSidebar } from './Sidebar';
import { motion } from 'framer-motion';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();

  // All authenticated roles get the sidebar
  const hasSidebar = !!user;

  // Pixel values so Framer Motion can animate them correctly
  const SIDEBAR_WIDTH = 240;
  const SIDEBAR_COLLAPSED_WIDTH = 64;

  const marginLeft = hasSidebar
    ? isCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_WIDTH
    : 0;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--cr-bg)', color: 'var(--cr-text)' }}
    >
      {/* Desktop sidebar — position: fixed, rendered once */}
      {hasSidebar && <Sidebar />}

      {/* Mobile sidebar drawer — renders as overlay above everything */}
      {hasSidebar && <MobileSidebar />}

      {/* Main content — offset to the right of the fixed sidebar */}
      <motion.div
        className="flex flex-col min-h-screen"
        animate={{ marginLeft }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <Navbar />
        <motion.main
          className="flex-1 p-4 md:p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </motion.div>
    </div>
  );
};
