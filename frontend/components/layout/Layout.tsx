import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSidebarStore } from '../../store/useSidebarStore';
import { Navbar } from './Navbar';
import { Sidebar, MobileSidebar } from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();
  const location = useLocation();

  // Responsive desktop detection for sidebar margin
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // All authenticated roles get the sidebar
  const hasSidebar = !!user;

  // Pixel values so Framer Motion can animate them correctly
  const SIDEBAR_WIDTH = 240;
  const SIDEBAR_COLLAPSED_WIDTH = 64;

  const marginLeft =
    hasSidebar && isDesktop
      ? isCollapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : SIDEBAR_WIDTH
      : 0;

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: 'var(--cr-bg)', color: 'var(--cr-text)' }}
    >
      {/* Desktop sidebar — position: fixed, rendered once */}
      {hasSidebar && <Sidebar />}

      {/* Mobile sidebar drawer — renders as overlay above everything */}
      {hasSidebar && <MobileSidebar />}

      {/* Main content — offset to the right of the fixed sidebar on desktop */}
      <motion.div
        className="flex flex-col min-h-screen"
        animate={{ marginLeft }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <Navbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="flex-1 p-3.5 sm:p-5 md:p-6 w-full max-w-full overflow-x-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
