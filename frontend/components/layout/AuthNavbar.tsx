import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, ArrowLeft, Globe } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Minimal navbar shown on public auth pages (Login / Signup).
 * Has: logo → home, back link, theme toggle.
 */
export function AuthNavbar() {
  const { isDark, toggleTheme } = useThemeStore();
  const { lang, setLang, languages, currentLanguage } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <motion.header
      className="w-full border-b sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--cr-surface)',
        borderColor: 'var(--cr-border)',
        backdropFilter: 'blur(12px)',
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Tricolor accent */}
      <div className="cr-tricolor-bar" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center shadow-sm relative group-hover:opacity-90 transition-opacity">
            <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <span
              className="text-[14px] font-bold leading-none"
              style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--cr-text)' }}
            >
              Jan<span style={{ color: 'var(--cr-orange)' }}> Samadhan</span>
            </span>
            <p className="text-[9.5px] text-[var(--cr-text-muted)] font-medium uppercase tracking-wider leading-none mt-0.5">
              Platform
            </p>
          </div>
        </NavLink>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--cr-bg)]"
          >
            <ArrowLeft size={13} />
            Back to Home
          </NavLink>

          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-bold text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--cr-bg)] border border-[var(--cr-border)]"
              aria-label="Change language"
            >
              <Globe size={13} />
              <span>{currentLanguage.flag}</span>
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 bg-[var(--cr-surface)] border border-[var(--cr-border)] rounded-lg shadow-lg p-1.5 z-50"
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-[12px] rounded-md w-full text-left transition-colors ${
                        lang === l.code ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/40 dark:text-blue-400' : 'text-[var(--cr-text)] hover:bg-[var(--cr-bg)]'
                      }`}
                    >
                      <span>{l.nativeName}</span>
                      <span className="text-[9px] text-[var(--cr-text-muted)] font-mono">{l.code.toUpperCase()}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <motion.button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-bg)] transition-colors border border-[var(--cr-border)]"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? 'sun' : 'moon'}
                initial={{ rotate: -20, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 20, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
