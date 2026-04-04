import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Brain, Users, Mic, Camera, QrCode,
  Globe, BarChart3, ArrowRight, CheckCircle, Zap,
  MapPin, MessageSquare, Lock, ChevronRight, Star,
  FileText, Wrench, Phone,
} from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';

// ─── Animation variants ──────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Animated Counter ────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Section wrapper with intersection reveal ─────────────
function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Features data ───────────────────────────────────────
const features = [
  {
    icon: Brain,
    color: '#0055A4',
    bg: 'var(--cr-blue-light)',
    title: 'AI Classification & Routing',
    desc: 'LangGraph pipeline auto-classifies incidents by category, severity, and optimal department — in under 3 seconds.',
  },
  {
    icon: Globe,
    color: '#1A7A3E',
    bg: 'var(--cr-green-light)',
    title: 'Multi-Language Translation',
    desc: 'Reports in Hindi, Tamil, Telugu, Marathi or any regional language are auto-translated for processing.',
  },
  {
    icon: Camera,
    color: '#F47920',
    bg: 'var(--cr-orange-light)',
    title: 'Computer Vision Pipeline',
    desc: 'Groq-powered vision analysis extracts issue type, severity, and damage extent from uploaded photos.',
  },
  {
    icon: QrCode,
    color: '#0055A4',
    bg: 'var(--cr-blue-light)',
    title: 'Real-Time QR Tracking',
    desc: 'Every public project has a scannable QR code for citizens to check live status and progress.',
  },
  {
    icon: Wrench,
    color: '#92400E',
    bg: 'var(--cr-amber-light)',
    title: 'Worker Proof-of-Resolution',
    desc: 'Field workers submit geotagged photographic evidence. AI verifies authenticity before marking resolved.',
  },
  {
    icon: BarChart3,
    color: '#1A7A3E',
    bg: 'var(--cr-green-light)',
    title: 'Transparency Dashboard',
    desc: 'Real-time analytics on resolution rates, response times, and department performance — open to all.',
  },
];

// ─── Steps data ──────────────────────────────────────────
const steps = [
  {
    step: '01',
    icon: MessageSquare,
    title: 'Citizen Reports',
    desc: 'Describe the issue by text, voice, or photo in any language. Our multi-modal AI understands it.',
    color: 'var(--cr-blue-mid)',
  },
  {
    step: '02',
    icon: Brain,
    title: 'AI Classifies & Routes',
    desc: 'LangGraph orchestrates classification, translation, severity scoring, and department dispatch — automatically.',
    color: 'var(--cr-orange)',
  },
  {
    step: '03',
    icon: CheckCircle,
    title: 'Workers Resolve & Verify',
    desc: 'Field workers receive assignments, submit proof-of-resolution. Citizens track status in real-time.',
    color: 'var(--cr-green)',
  },
];

// ─── Trust stats ─────────────────────────────────────────
const stats = [
  { label: 'Incidents Processed', value: 500, suffix: '+' },
  { label: 'AI Pipeline Accuracy', value: 94, suffix: '%' },
  { label: 'Avg. Resolution Time', value: 48, suffix: 'h' },
  { label: 'Citizen Roles Served', value: 3, suffix: '' },
];

// ─── Testimonials ─────────────────────────────────────────
const testimonials = [
  {
    text: 'Reported a water leakage early morning. It was fixed by evening. Incredible.',
    name: 'Priya S.',
    role: 'Citizen, Bengaluru',
  },
  {
    text: 'Managing 50+ incidents daily is now seamless. The AI routing is remarkably accurate.',
    name: 'ACP Ramesh K.',
    role: 'Authority Officer',
  },
  {
    text: 'As a field worker, I finally have clarity on assignments. The proof upload is intuitive.',
    name: 'Santosh M.',
    role: 'Municipal Worker',
  },
];

// ─── Main Component ──────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const { t, lang, setLang, languages, currentLanguage } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() =>
      setTestimonialIdx((i) => (i + 1) % testimonials.length), 4000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cr-bg)', color: 'var(--cr-text)' }}>
      {/* ═══════════════════════════════════════
          STICKY HEADER — UX4G Government Bar
          ═══════════════════════════════════════ */}
      <header
        className="cr-glass sticky top-0 z-50 border-b"
        style={{ borderColor: 'var(--cr-glass-border)' }}
      >
        {/* Tricolor bar */}
        <div className="cr-tricolor-bar" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md overflow-hidden bg-[var(--cr-blue-mid)] flex items-center justify-center shadow-sm relative">
              <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1
                className="text-[15px] font-bold leading-none"
                style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--cr-text)' }}
              >
                Jan <span style={{ color: 'var(--cr-orange)' }}>Samadhan</span>
              </h1>
              <p className="text-[9.5px] text-[var(--cr-text-muted)] font-medium uppercase tracking-wider leading-none mt-0.5">
                Ministry of Urban Development
              </p>
            </div>
          </NavLink>

          {/* Nav links + CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#how-it-works"
              className="hidden md:block text-[13px] font-medium text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] transition-colors px-2 py-1"
            >
              {t('landing.howItWorks')}
            </a>
            <a
              href="#features"
              className="hidden md:block text-[13px] font-medium text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] transition-colors px-2 py-1"
            >
              {t('landing.features')}
            </a>
            <NavLink
              to="/track/demo"
              className="hidden md:block text-[13px] font-medium text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] transition-colors px-2 py-1"
            >
              {t('landing.track')}
            </NavLink>

            {/* Language selector */}
            <div className="relative ml-2" ref={langRef}>
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

            <NavLink to="/login" className="cr-btn cr-btn-secondary text-[13px] py-2 px-4">
              {t('landing.signIn')}
            </NavLink>
            <NavLink to="/signup" className="cr-btn cr-btn-primary text-[13px] py-2 px-4">
              {t('landing.getStarted')}
            </NavLink>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden cr-hero-grid cr-noise"
        style={{ minHeight: '88vh', display: 'flex', alignItems: 'center' }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              top: '-15%', left: '-10%',
              background: 'radial-gradient(circle, rgba(0,85,164,0.12) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[450px] h-[450px] rounded-full"
            style={{
              bottom: '-10%', right: '-5%',
              background: 'radial-gradient(circle, rgba(244,121,32,0.10) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute w-[350px] h-[350px] rounded-full"
            style={{
              top: '40%', left: '50%',
              background: 'radial-gradient(circle, rgba(26,122,62,0.07) 0%, transparent 70%)',
              filter: 'blur(35px)',
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              {/* Gov badge */}
              <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center gap-2 bg-[var(--cr-blue-light)] border border-[var(--cr-blue-mid)]/20 text-[var(--cr-blue-mid)] px-3 py-1.5 rounded-full text-[12px] font-semibold mb-6"
              >
                <ShieldCheck size={13} />
                {t('landing.govBadge')}
              </motion.div>

              <motion.h1
                custom={0.1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-[42px] sm:text-[52px] font-black leading-[1.05] tracking-tight mb-6"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {t('landing.heroTitle1')}
                <br />
                <span className="cr-shimmer-text">{t('landing.heroTitle2')}</span>
                <br />
                {t('landing.heroTitle3')}
              </motion.h1>

              <motion.p
                custom={0.2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-[16px] text-[var(--cr-text-secondary)] leading-relaxed mb-8 max-w-lg"
              >
                {t('landing.heroSubtitle')}
              </motion.p>

              {/* CTAs */}
              <motion.div
                custom={0.3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-3 mb-10"
              >
                <NavLink
                  to="/signup"
                  className="cr-btn cr-btn-primary text-[15px] px-6 py-3 shadow-xl"
                  style={{ boxShadow: '0 4px 24px rgba(0,85,164,0.30)' }}
                >
                  <MapPin size={16} />
                  {t('landing.reportIssue')}
                  <ArrowRight size={15} />
                </NavLink>
                <NavLink
                  to="/login"
                  className="cr-btn cr-btn-secondary text-[15px] px-6 py-3"
                >
                  {t('landing.signInDashboard')}
                </NavLink>
              </motion.div>

              {/* Trust chips */}
              <motion.div
                custom={0.4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-3"
              >
                {[
                  { icon: Lock, label: 'Govt. Secured' },
                  { icon: Zap, label: 'AI Powered' },
                  { icon: Globe, label: 'Multi-Language' },
                  { icon: Phone, label: 'WhatsApp Ready' },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--cr-text-muted)] bg-[var(--cr-surface)] border border-[var(--cr-border)] px-3 py-1.5 rounded-full"
                  >
                    <Icon size={12} style={{ color: 'var(--cr-blue-mid)' }} />
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — visual card stack */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block relative"
            >
              {/* Main incident card */}
              <motion.div
                className="cr-card shadow-2xl relative"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="cr-tricolor-bar rounded-t-[10px]" style={{ marginTop: '-24px', marginLeft: '-24px', marginRight: '-24px', marginBottom: '20px' }} />
                <div className="flex items-center justify-between mb-4">
                  <span className="cr-mono text-[11px] text-[var(--cr-blue-mid)] bg-[var(--cr-blue-light)] px-2 py-1 rounded">
                    INC-2024-00847
                  </span>
                  <span className="cr-badge cr-badge-progress">In Progress</span>
                </div>
                <h3 className="font-bold text-[16px] mb-1">Pothole on MG Road</h3>
                <p className="text-[13px] text-[var(--cr-text-muted)] mb-4">Near Government School Gate — Risk: High</p>

                {/* AI metadata */}
                <div className="bg-[var(--cr-blue-pale)] rounded-lg p-3 mb-4 border border-[var(--cr-blue-mid)]/15">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--cr-blue-mid)] mb-2 flex items-center gap-1">
                    <Brain size={10} /> AI Analysis Complete
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Category', val: 'Pothole' },
                      { label: 'Severity', val: 'High' },
                      { label: 'Route', val: 'PWD' },
                    ].map((item) => (
                      <div key={item.label} className="bg-[var(--cr-surface)] rounded p-2 border border-[var(--cr-border)]">
                        <p className="text-[9px] text-[var(--cr-text-muted)] font-semibold uppercase tracking-wide">{item.label}</p>
                        <p className="text-[12px] font-bold text-[var(--cr-text)] mt-0.5">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="cr-progress mb-2">
                  <motion.div
                    className="cr-progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[11px] text-[var(--cr-text-muted)]">65% Complete — Worker dispatched</p>
              </motion.div>

              {/* Floating mini cards */}
              <motion.div
                className="absolute -bottom-8 -left-10 cr-card shadow-lg"
                style={{ width: 160, padding: '12px 14px' }}
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-[var(--cr-green-light)] flex items-center justify-center">
                    <CheckCircle size={10} style={{ color: 'var(--cr-green)' }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--cr-green)]">Resolved</span>
                </div>
                <p className="text-[10px] text-[var(--cr-text-muted)] leading-snug">Garbage cleared — Proof submitted by Worker #14</p>
              </motion.div>

              <motion.div
                className="absolute -top-6 -right-8 cr-card shadow-lg"
                style={{ width: 150, padding: '12px 14px' }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Mic size={10} style={{ color: 'var(--cr-orange)' }} />
                  <span className="text-[10px] font-bold" style={{ color: 'var(--cr-orange)' }}>Voice Report</span>
                </div>
                <p className="text-[10px] text-[var(--cr-text-muted)] leading-snug">
                  "बिजली का खंभा टूटा है..." → Auto-translated & classified
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          STATS BAR
          ═══════════════════════════════════════ */}
      <section className="border-y" style={{ borderColor: 'var(--cr-border)', backgroundColor: 'var(--cr-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <RevealSection className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 text-center">
            {stats.map((s) => (
              <motion.div key={s.label} variants={cardVariant}>
                <div
                  className="text-[38px] font-black leading-none mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--cr-blue-mid)' }}
                >
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <p className="text-[13px] text-[var(--cr-text-muted)] font-medium">{s.label}</p>
              </motion.div>
            ))}
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-20"
        style={{ backgroundColor: 'var(--cr-bg)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="cr-tag mb-3 inline-flex">How It Works</span>
              <h2
                className="text-[36px] font-black mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                From Report to Resolution
              </h2>
              <p className="text-[15px] text-[var(--cr-text-muted)] max-w-xl mx-auto">
                Three steps powered by AI — no bureaucratic delays, no manual sorting.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div
                className="hidden md:block absolute top-12 left-[calc(16.66%+12px)] right-[calc(16.66%+12px)] h-px"
                style={{ background: 'linear-gradient(to right, var(--cr-blue-mid), var(--cr-orange), var(--cr-green))' }}
              />

              {steps.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={cardVariant}
                  className="cr-card p-6 relative"
                >
                  {/* Step number badge */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-black mb-4 shadow-lg"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.step}
                  </div>

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <step.icon size={22} style={{ color: step.color }} />
                  </div>

                  <h3
                    className="text-[17px] font-bold mb-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[13.5px] text-[var(--cr-text-muted)] leading-relaxed">
                    {step.desc}
                  </p>

                  {i < steps.length - 1 && (
                    <ChevronRight
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:block"
                      style={{ color: 'var(--cr-border-strong)' }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES GRID
          ═══════════════════════════════════════ */}
      <section
        id="features"
        className="py-20 relative overflow-hidden"
        style={{ backgroundColor: 'var(--cr-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="cr-tag mb-3 inline-flex">Features</span>
              <h2
                className="text-[36px] font-black mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Built for the Future of Governance
              </h2>
              <p className="text-[15px] text-[var(--cr-text-muted)] max-w-xl mx-auto">
                Every feature designed with UX4G standards — accessible, robust, and intelligent.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={cardVariant}
                  className="cr-card cr-hover-lift p-6 group cursor-default"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: f.bg }}
                  >
                    <f.icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3
                    className="text-[16px] font-bold mb-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-[13.5px] text-[var(--cr-text-muted)] leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          ROLES SECTION
          ═══════════════════════════════════════ */}
      <section className="py-20" style={{ backgroundColor: 'var(--cr-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="cr-tag mb-3 inline-flex">User Roles</span>
              <h2
                className="text-[36px] font-black mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                A Platform for All Stakeholders
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: Users,
                  role: 'Citizen',
                  color: 'var(--cr-blue-mid)',
                  bg: 'var(--cr-blue-light)',
                  perks: ['Report incidents by text, voice, or photo', 'Track resolution status', 'QR-scan project updates', 'Auto-AI classification of reports'],
                },
                {
                  icon: ShieldCheck,
                  role: 'Authority Officer',
                  color: 'var(--cr-orange)',
                  bg: 'var(--cr-orange-light)',
                  perks: ['AI-powered incident dashboard', 'Route workers to incidents', 'Analytics & performance KPIs', 'QR project management'],
                },
                {
                  icon: Wrench,
                  role: 'Field Worker',
                  color: 'var(--cr-green)',
                  bg: 'var(--cr-green-light)',
                  perks: ['Receive assigned field tasks', 'Upload photo proof-of-resolution', 'GPS-verified completion', 'Simple intuitive mobile UI'],
                },
              ].map((r) => (
                <motion.div
                  key={r.role}
                  variants={cardVariant}
                  className="cr-card p-7"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: r.bg }}
                  >
                    <r.icon size={26} style={{ color: r.color }} />
                  </div>
                  <h3
                    className="text-[18px] font-bold mb-4"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: r.color }}
                  >
                    {r.role}
                  </h3>
                  <ul className="space-y-2.5">
                    {r.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-[13.5px] text-[var(--cr-text-secondary)]">
                        <CheckCircle size={14} style={{ color: r.color, marginTop: 2, flexShrink: 0 }} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TESTIMONIALS
          ═══════════════════════════════════════ */}
      <section
        className="py-20"
        style={{ backgroundColor: 'var(--cr-blue)', position: 'relative', overflow: 'hidden' }}
      >
        <div className="cr-hero-grid absolute inset-0 opacity-10" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 text-white/60 text-[12px] font-bold uppercase tracking-wider mb-8">
            <Star size={12} className="text-[var(--cr-orange)]" /> Citizen Voices
          </span>

          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <p
                className="text-[22px] sm:text-[26px] font-medium text-white leading-relaxed mb-8"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                "{testimonials[testimonialIdx].text}"
              </p>
              <p className="text-[var(--cr-orange)] font-bold text-[15px]">
                {testimonials[testimonialIdx].name}
              </p>
              <p className="text-white/50 text-[13px] mt-1">
                {testimonials[testimonialIdx].role}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                className="transition-all duration-300"
                style={{
                  width: i === testimonialIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  background: i === testimonialIdx ? 'var(--cr-orange)' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════ */}
      <section className="py-20" style={{ backgroundColor: 'var(--cr-surface)' }}>
        <RevealSection>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] px-3 py-1.5 rounded-full text-[12px] font-semibold mb-6"
            >
              <Zap size={12} /> Join Jan Samadhan Today
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-[38px] font-black mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Your city. Better served.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[16px] text-[var(--cr-text-muted)] mb-8 max-w-lg mx-auto"
            >
              Sign up as a citizen to report issues, or contact your municipal authority to request platform access.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              <NavLink
                to="/signup"
                className="cr-btn cr-btn-primary text-[15px] px-8 py-3.5"
                style={{ boxShadow: '0 4px 24px rgba(0,85,164,0.30)' }}
              >
                Create Account <ArrowRight size={16} />
              </NavLink>
              <a
                href="#how-it-works"
                className="cr-btn cr-btn-secondary text-[15px] px-8 py-3.5"
              >
                Learn More
              </a>
            </motion.div>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER — UX4G Government Footer
          ═══════════════════════════════════════ */}
      <footer
        className="border-t"
        style={{ borderColor: 'var(--cr-border)', backgroundColor: 'var(--cr-bg)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md overflow-hidden bg-[var(--cr-blue-mid)] flex items-center justify-center relative">
                <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-cover" />
              </div>
              <div>
                <p
                  className="text-[13px] font-bold"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--cr-text)' }}
                >
                  Jan Samadhan
                </p>
                <p className="text-[11px] text-[var(--cr-text-muted)]">
                  Ministry of Urban Development, Government of India
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-[12.5px] text-[var(--cr-text-muted)]">
              <a href="#" className="hover:text-[var(--cr-text)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--cr-text)] transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-[var(--cr-text)] transition-colors">Accessibility</a>
              <NavLink to="/signup" className="hover:text-[var(--cr-text)] transition-colors">Register</NavLink>
              <NavLink to="/login" className="hover:text-[var(--cr-text)] transition-colors">Login</NavLink>
            </div>
          </div>

          <hr className="cr-rule my-6" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[11.5px] text-[var(--cr-text-muted)]">
            <p>© 2024 Jan Samadhan. All rights reserved. Built with UX4G Design Standards.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <FileText size={11} />
                RTI-compliant
              </span>
              <span className="flex items-center gap-1.5">
                <Lock size={11} />
                ISO 27001 Aligned
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
