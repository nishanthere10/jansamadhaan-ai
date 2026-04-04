import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useSidebarStore } from '../../store/useSidebarStore';
import {
  Bell, Sun, Moon, PanelLeft, PanelLeftClose, Search, ChevronDown,
  LogOut, Settings, User, Globe, CheckCircle
} from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { fetchWithAuth } from '../../lib/api';
import type { Notification } from '../../types';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { toggleCollapse, setMobileOpen, isCollapsed } = useSidebarStore();
  const { t, lang, setLang, languages, currentLanguage } = useTranslation();
  const showSearch = user?.role === 'authority' || user?.role === 'citizen';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        if (!user) return;
        const res = await fetchWithAuth('/api/v1/notifications');
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load notifications in Navbar', err);
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Pool every 30s
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await fetchWithAuth(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch(err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const roleColors = {
    authority: 'bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)]',
    citizen:   'bg-[var(--cr-green-light)] text-[var(--cr-green)]',
    worker:    'bg-[var(--cr-amber-light)] text-[var(--cr-amber)]',
  };
  const roleColor = roleColors[(user?.role as keyof typeof roleColors) ?? 'citizen'];

  const roleLabels = {
    authority: 'Authority Officer',
    citizen:   'Citizen',
    worker:    'Field Worker',
  };
  const roleLabel = roleLabels[(user?.role as keyof typeof roleLabels) ?? 'citizen'];

  return (
    <motion.nav
      className="cr-navbar gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* ── Left: Toggle + Brand ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Desktop sidebar collapse toggle */}
        <div className="hidden md:flex">
          <motion.button
            onClick={toggleCollapse}
            className="cr-btn-ghost cr-btn p-2 rounded-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </motion.button>
        </div>

        {/* Mobile slide drawer toggle */}
        <div className="flex md:hidden">
          <motion.button
            onClick={() => setMobileOpen(true)}
            className="cr-btn-ghost cr-btn p-2 rounded-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open menu"
          >
            <PanelLeft size={18} />
          </motion.button>
        </div>

        {/* Brand mark */}
        <NavLink
          to="/dashboard"
          className="hidden sm:flex items-center gap-2 text-decoration-none group"
        >
          <div className="w-7 h-7 rounded-sm overflow-hidden flex items-center justify-center shadow-sm relative">
            <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-contain" />
          </div>
          <span
            className="text-[13.5px] font-bold text-[var(--cr-text)] tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Jan<span className="text-[var(--cr-orange)]"> Samadhan</span>
          </span>
        </NavLink>
      </div>

      {/* ── Center: Search ── */}
      {showSearch && (
        <div className="flex-1 max-w-sm mx-auto hidden md:block">
          <motion.div
            className="relative"
            animate={{ scale: searchFocused ? 1.01 : 1 }}
            transition={{ duration: 0.15 }}
          >
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search incidents…"
              className="cr-input text-[13px] h-[36px] rounded-lg"
              style={{ paddingLeft: 34, paddingRight: 40, paddingTop: 8, paddingBottom: 8 }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[10px] text-[var(--cr-text-muted)] font-mono bg-[var(--cr-bg-offset)] border border-[var(--cr-border)] px-1.5 py-0.5 rounded pointer-events-none">
              ⌘K
            </span>
          </motion.div>
        </div>
      )}

      {/* ── Spacer (if no search) ── */}
      {!showSearch && <div className="flex-1" />}

      {/* ── Right: Actions ── */}
      {/* Note: Language selector is among the action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="cr-btn-ghost cr-btn p-2 rounded-lg"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 30, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Language Selector */}
        <div className="relative" ref={langDropdownRef}>
          <motion.button
            onClick={() => setLangDropdownOpen((v) => !v)}
            className="cr-btn-ghost cr-btn px-2 py-1.5 rounded-lg flex items-center gap-1.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={t('common.language')}
            aria-label="Change language"
          >
            <Globe size={14} />
            <span className="text-[11px] font-bold tracking-tight">{currentLanguage.flag}</span>
          </motion.button>

          <AnimatePresence>
            {langDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-48 cr-card p-1.5 z-50"
                style={{ boxShadow: 'var(--cr-shadow-lg)' }}
              >
                <div className="px-3 py-2 border-b border-[var(--cr-divider)] mb-1">
                  <p className="text-[11px] font-bold text-[var(--cr-text-muted)] uppercase tracking-wider">{t('common.language')}</p>
                </div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangDropdownOpen(false); }}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-[13px] rounded-md w-full text-left transition-colors ${
                      lang === l.code
                        ? 'bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] font-bold'
                        : 'text-[var(--cr-text)] hover:bg-[var(--cr-bg)]'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <span className="text-[10px] text-[var(--cr-text-muted)] font-mono">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifDropdownRef}>
          <motion.button
            onClick={() => setNotifDropdownOpen((v) => !v)}
            className="cr-btn-ghost cr-btn p-2 rounded-lg relative"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full bg-[var(--cr-orange)] border-2 border-[var(--cr-surface)] animate-pulse" />
            )}
          </motion.button>

          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-72 cr-card p-0 z-50 overflow-hidden"
                style={{ boxShadow: 'var(--cr-shadow-lg)' }}
              >
                <div className="px-4 py-3 border-b border-[var(--cr-divider)] bg-[var(--cr-bg-offset)] flex justify-between items-center">
                  <p className="text-[12px] font-bold text-[var(--cr-text)] uppercase tracking-wider">Notifications {unreadCount > 0 && `(${unreadCount})`}</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[var(--cr-text-muted)] text-[13px]">
                      <Bell size={24} className="mx-auto mb-2 opacity-50" />
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} 
                           className={`p-3 border-b border-[var(--cr-divider)] text-[13px] hover:bg-[var(--cr-bg-offset)] transition-colors ${!notif.is_read ? 'bg-[var(--cr-blue-light)]/20' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-[var(--cr-text)]">{notif.title}</p>
                            <p className="text-[12px] text-[var(--cr-text-muted)] mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-[var(--cr-text-muted)] font-mono mt-1">
                              {new Date(notif.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button onClick={() => markAsRead(notif.id)} className="text-[var(--cr-blue-mid)] hover:text-[var(--cr-blue)] p-1" title="Mark as read">
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <motion.button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-[var(--cr-bg-offset)] transition-colors"
            whileTap={{ scale: 0.98 }}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border border-[var(--cr-border)] flex-shrink-0 ${roleColor}`}
            >
              {initials}
            </div>
            {/* Name + role (hidden on small screens) */}
            <div className="hidden md:block text-left">
              <p className="text-[12.5px] font-semibold text-[var(--cr-text)] leading-tight whitespace-nowrap">
                {user?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10.5px] text-[var(--cr-text-muted)]">{roleLabel}</p>
            </div>
            <motion.span
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--cr-text-muted)] hidden md:block"
            >
              <ChevronDown size={14} />
            </motion.span>
          </motion.button>

          {/* Dropdown panel */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-56 cr-card p-1.5 z-50"
                style={{ boxShadow: 'var(--cr-shadow-lg)' }}
              >
                {/* User info header */}
                <div className="px-3 py-2.5 border-b border-[var(--cr-divider)] mb-1">
                  <p className="text-[13px] font-semibold text-[var(--cr-text)] truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[11px] text-[var(--cr-text-muted)] truncate mt-0.5">
                    {user?.email}
                  </p>
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColor}`}>
                    {user?.role}
                  </span>
                </div>

                {/* Menu items */}
                <NavLink
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--cr-text)] rounded-md hover:bg-[var(--cr-bg)] transition-colors"
                >
                  <User size={14} className="text-[var(--cr-text-muted)]" />
                  Profile & Settings
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--cr-text)] rounded-md hover:bg-[var(--cr-bg)] transition-colors"
                >
                  <Settings size={14} className="text-[var(--cr-text-muted)]" />
                  Preferences
                </NavLink>

                <div className="border-t border-[var(--cr-divider)] my-1" />

                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--cr-red)] rounded-md hover:bg-[var(--cr-red-light)] transition-colors w-full text-left"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}
