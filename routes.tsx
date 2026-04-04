import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import LandingPage from './pages/public/LandingPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { useAuthStore } from './store/useAuthStore';
import AuthorityDashboard from './pages/authority/Dashboard';
import AuthorityQrProjects from './pages/authority/QrProjects';
import Analytics from './pages/authority/Analytics';
import SettingsPage from './pages/shared/Settings';
import IncidentsList from './pages/shared/IncidentsList';
import CitizenDashboard from './pages/citizen/Dashboard';
import WorkerDashboard from './pages/worker/Dashboard';
import ReportIncident from './pages/citizen/ReportIncident';
import QrTracker from './pages/public/QrTracker';
import type { UserRole } from './types';

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
    <a href="/" className="cr-btn cr-btn-primary">
      ← Return Home
    </a>
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
    <a href="/" className="cr-btn cr-btn-primary">
      ← Return Home
    </a>
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
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Public QR tracker — no auth needed */}
        <Route path="/track/:id" element={<QrTracker />} />

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated app shell */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* Dashboard — role-based */}
                  <Route path="/dashboard" element={<RoleBasedHome />} />

                  {/* Shared routes — all authenticated users */}
                  <Route path="/incidents" element={<IncidentsList />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Citizen only */}
                  <Route
                    path="/citizen/report"
                    element={
                      <RoleRoute roles={['citizen']}>
                        <ReportIncident />
                      </RoleRoute>
                    }
                  />

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
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
