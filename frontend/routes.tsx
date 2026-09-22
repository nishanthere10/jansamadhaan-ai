import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { useAuthStore } from './store/useAuthStore';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import type { UserRole } from './types';

// ─── Code-Split Dynamic Imports (slashes initial bundle) ──
const Login = React.lazy(() => import('./pages/auth/Login'));
const Signup = React.lazy(() => import('./pages/auth/Signup'));
const LandingPage = React.lazy(() => import('./pages/public/LandingPage'));
const AuthorityDashboard = React.lazy(() => import('./pages/authority/Dashboard'));
const AuthorityQrProjects = React.lazy(() => import('./pages/authority/QrProjects'));
const Analytics = React.lazy(() => import('./pages/authority/Analytics'));
const SettingsPage = React.lazy(() => import('./pages/shared/Settings'));
const IncidentsList = React.lazy(() => import('./pages/shared/IncidentsList'));
const CitizenDashboard = React.lazy(() => import('./pages/citizen/Dashboard'));
const WorkerDashboard = React.lazy(() => import('./pages/worker/Dashboard'));
const ReportIncident = React.lazy(() => import('./pages/citizen/ReportIncident'));
const CitizenReceipt = React.lazy(() => import('./pages/citizen/CitizenReceipt'));
const QrTracker = React.lazy(() => import('./pages/public/QrTracker'));

// ─── Page Loading Fallback ────────────────────────────────
const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <LoadingSpinner size="lg" />
    <span className="text-xs text-slate-400 mt-3 font-medium animate-pulse">Loading module...</span>
  </div>
);

// ─── Role-based Dashboard Router ─────────────────────────
const RoleBasedHome = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'authority') return <AuthorityDashboard />;
  if (user?.role === 'worker') return <WorkerDashboard />;
  return <CitizenDashboard />;
};

// ─── Unauthorized Page ────────────────────────────────────
const UnauthorizedPage = () => (
  <div className="min-h-screen cr-auth-bg flex flex-col items-center justify-center gap-4 text-center p-8">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
      style={{ backgroundColor: 'var(--cr-red-light)', color: 'var(--cr-red)' }}
    >
      !
    </div>
    <h1 className="cr-page-title">Access Denied</h1>
    <p className="cr-page-subtitle max-w-sm">
      You do not have permission to view this page. Please contact your administrator.
    </p>
    <Link to="/" className="cr-btn cr-btn-primary">
      ← Return Home
    </Link>
  </div>
);

// ─── 404 Page ────────────────────────────────────────────
const NotFoundPage = () => (
  <div className="min-h-screen cr-auth-bg flex flex-col items-center justify-center gap-4 text-center p-8">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
      style={{ backgroundColor: 'var(--cr-blue-light)', color: 'var(--cr-blue-mid)' }}
    >
      ?
    </div>
    <h1 className="cr-page-title">Page Not Found</h1>
    <p className="cr-page-subtitle max-w-sm">
      The page you're looking for doesn't exist or may have been moved.
    </p>
    <Link to="/" className="cr-btn cr-btn-primary">
      ← Return Home
    </Link>
  </div>
);

// ─── Protected role-specific route helper ────────────────
const RoleRoute = ({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: UserRole[];
}) => (
  <ProtectedRoute allowedRoles={roles}>
    {children}
  </ProtectedRoute>
);

// ─── App Routes ───────────────────────────────────────────
export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public QR tracker — no auth needed. `/track` alone renders the
              tracking-ID lookup form. */}
          <Route path="/track" element={<QrTracker />} />
          <Route path="/track/:id" element={<QrTracker />} />

          {/* Error pages */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Authenticated app shell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Dashboard — role-based */}
                      <Route path="/dashboard" element={<RoleBasedHome />} />

                      {/* Direct portal routes guarded by role */}
                      <Route
                        path="/authority"
                        element={
                          <RoleRoute roles={['authority']}>
                            <AuthorityDashboard />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/citizen"
                        element={
                          <RoleRoute roles={['citizen']}>
                            <CitizenDashboard />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/worker"
                        element={
                          <RoleRoute roles={['worker']}>
                            <WorkerDashboard />
                          </RoleRoute>
                        }
                      />

                      {/* Shared routes */}
                      <Route path="/incidents" element={<IncidentsList />} />
                      <Route
                        path="/analytics"
                        element={
                          <RoleRoute roles={['authority']}>
                            <Analytics />
                          </RoleRoute>
                        }
                      />
                      <Route path="/settings" element={<SettingsPage />} />

                      {/* Incident reporting routes */}
                      <Route
                        path="/citizen/report"
                        element={
                          <RoleRoute roles={['citizen']}>
                            <ReportIncident />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/citizen/incidents/:id/receipt"
                        element={
                          <RoleRoute roles={['citizen']}>
                            <CitizenReceipt />
                          </RoleRoute>
                        }
                      />
                      <Route path="/report" element={<ReportIncident />} />

                      {/* Authority only */}
                      <Route
                        path="/qr-projects"
                        element={
                          <RoleRoute roles={['authority']}>
                            <AuthorityQrProjects />
                          </RoleRoute>
                        }
                      />

                      {/* Redirect /dashboard-fallback for old / path */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />

                      {/* Fallback inside layout → 404 */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
