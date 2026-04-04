import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, AlertCircle, QrCode, PieChart, Settings,
  ChevronLeft, ChevronRight, LogOut,
  FileText, Wrench, X, BarChart2,
} from 'lucide-react';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../lib/useTranslation';

// ─── Menu config per role ──────────────────────────────────
const MENU_BY_ROLE = {
  authority: [
    { key: 'nav.dashboard',  path: '/dashboard',   icon: Home,         label: 'Dashboard' },
    { key: 'nav.incidents',  path: '/incidents',   icon: AlertCircle,  label: 'Incidents' },
    { key: 'nav.qrProjects', path: '/qr-projects', icon: QrCode,       label: 'QR Projects' },
    { key: 'nav.analytics',  path: '/analytics',   icon: BarChart2,    label: 'Analytics' },
    { key: 'nav.settings',   path: '/settings',    icon: Settings,     label: 'Settings' },
  ],
  citizen: [
    { key: 'nav.dashboard',  path: '/dashboard',      icon: Home,        label: 'Dashboard' },
    { key: 'nav.incidents',  path: '/incidents',       icon: FileText,    label: 'My Reports' },
    { key: 'nav.report',     path: '/citizen/report',  icon: AlertCircle, label: 'Report Issue' },
    { key: 'nav.settings',   path: '/settings',        icon: Settings,    label: 'Settings' },
  ],
  worker: [
    { key: 'nav.dashboard',  path: '/dashboard', icon: Wrench,   label: 'Dashboard' },
    { key: 'nav.settings',   path: '/settings',  icon: Settings, label: 'Settings' },
  ],
};

// ─── Sidebar content ──────────────────────────────────────
function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const { isCollapsed } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const role = (user?.role as keyof typeof MENU_BY_ROLE) ?? 'citizen';
  const menuItems = MENU_BY_ROLE[role] ?? MENU_BY_ROLE.citizen;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleTagColors: Record<string, string> = {
    authority: '#F47920',
    citizen:   '#1A7A3E',
    worker:    '#D97706',
  };
  const roleTag = roleTagColors[user?.role ?? 'citizen'] ?? '#888';

  return (
    <div className="flex flex-col h-full">
      {/* Tricolor stripe */}
      <div className="cr-tricolor-bar flex-shrink-0" />

      {/* Branding */}
      <div style={{
        padding: isCollapsed ? '14px 8px' : '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        flexShrink: 0,
        minHeight: 64,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/logo1.jpg" alt="Jan Samadhan" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{
                fontSize: 13.5, fontWeight: 800, color: '#fff',
                whiteSpace: 'nowrap', lineHeight: 1.2,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Jan <span style={{ color: '#FF9933' }}>Samadhan</span>
              </p>
              <p style={{
                fontSize: 9.5, color: 'rgba(255,255,255,0.45)',
                fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.14em', marginTop: 2,
              }}>
                Smart Civic Platform
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {!isCollapsed && (
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', padding: '0 10px', marginBottom: 6 }}>
            Navigation
          </p>
        )}
        {menuItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/dashboard'}
            onClick={onItemClick}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `cr-sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`
            }
          >
            <item.icon size={16} style={{ flexShrink: 0 }} />
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {t(item.key)}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
        {/* User info */}
        {!isCollapsed ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', marginBottom: 4,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `${roleTag}30`,
              border: `2px solid ${roleTag}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.full_name?.[0] ?? user?.email?.[0] ?? 'U'}
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name || user?.email || 'User'}
              </p>
              <span style={{
                fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: roleTag,
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `${roleTag}30`, border: `2px solid ${roleTag}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', margin: '0 auto 6px',
          }}>
            {user?.full_name?.[0] ?? user?.email?.[0] ?? 'U'}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`cr-sidebar-item w-full hover:bg-red-500/15 hover:text-red-300 ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {t('nav.signOut')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Version */}
        {!isCollapsed && (
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', padding: '8px 10px 2px', lineHeight: 1.6 }}>
            © Jan Samadhan v1.0 · MoUD India
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────
export function Sidebar() {
  const { isCollapsed, toggleCollapse } = useSidebarStore();

  return (
    <motion.aside
      className="cr-sidebar hidden md:flex flex-col relative"
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <SidebarContent />

      {/* Collapse toggle pill */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute', right: -12, top: 76,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--cr-blue-mid)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          border: '2px solid rgba(255,255,255,0.15)',
          cursor: 'pointer', zIndex: 10,
          transition: 'background 0.15s',
        }}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}

// ─── Mobile Sidebar Drawer ────────────────────────────────
export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="cr-sidebar-overlay md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <motion.aside
            className="cr-sidebar flex flex-col md:hidden"
            style={{ width: 'var(--sidebar-width)', zIndex: 200 }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', zIndex: 10,
              }}
              aria-label="Close menu"
            >
              <X size={14} />
            </button>

            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
