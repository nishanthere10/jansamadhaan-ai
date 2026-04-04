import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthNavbar } from '../../components/layout/AuthNavbar';
import { useTranslation } from '../../lib/useTranslation';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUser(result.data.user, result.data.access_token);
        navigate(from, { replace: true });
      } else {
        const errorMessage = result.detail || result.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
      }
    } catch {
      setError('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <AuthNavbar />

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="border-slate-200/60 dark:border-slate-800 shadow-xl shadow-blue-900/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
            <CardHeader className="space-y-4 pb-6 pt-8 px-8 items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 border border-slate-100 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="w-full h-full overflow-hidden rounded-2xl p-2">
                  <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-contain" />
                </div>
              </motion.div>
              
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {t('auth.portalTitle')}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('auth.portalSubtitle')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <AnimatePresence mode="sync">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 text-sm font-medium">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.form
                onSubmit={handleLogin}
                className="space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nodal.officer@gov.in"
                    className="h-11 transition-all focus-visible:ring-blue-500 dark:focus-visible:ring-blue-600 bg-white/50 dark:bg-slate-950/50"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your secure password"
                      className="h-11 pr-11 transition-all focus-visible:ring-blue-500 dark:focus-visible:ring-blue-600 bg-white/50 dark:bg-slate-950/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('auth.signingIn')}
                      </span>
                    ) : (
                      t('auth.signIn')
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </CardContent>

            <CardFooter className="px-8 pb-8 pt-0 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-sm text-slate-500 dark:text-slate-400"
              >
                {t('auth.newUser')}{' '}
                <a
                  href="/signup"
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-4 transition-all"
                >
                  {t('auth.createAccount')}
                </a>
              </motion.div>
            </CardFooter>
          </Card>

          <motion.p
            className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 tracking-wide font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {t('auth.govFooter')} &nbsp;•&nbsp; {t('auth.ministryFooter')}
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
