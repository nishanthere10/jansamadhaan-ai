import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HardHat, Info, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import type { QrProject, ApiResponse } from '../../types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  planned:   { label: 'Planned',   color: 'var(--cr-amber)' },
  active:    { label: 'Active',    color: 'var(--cr-blue-mid)' },
  delayed:   { label: 'Delayed',   color: 'var(--cr-red)' },
  completed: { label: 'Completed', color: 'var(--cr-green)' },
  cancelled: { label: 'Cancelled', color: 'var(--cr-red)' },
};

export default function QrTracker() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<QrProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setTimeout(() => {
        setNotFound(true);
        setLoading(false);
      }, 0);
      return;
    }

    // Public unauthenticated endpoint — fetch single project directly
    fetch(`/api/v1/qr-projects/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        const json = await res.json();
        if (json.success && json.data) {
          setProject(json.data);
        } else {
          setError(json.detail || json.message || 'Failed to load project data.');
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Network error';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cr-auth-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ─── Generic error ────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen cr-auth-bg flex items-center justify-center p-8">
        <EmptyState
          title="Could Not Load Project"
          description={error}
          action={
            <button
              onClick={() => window.location.reload()}
              className="cr-btn cr-btn-primary"
            >
              Try Again
            </button>
          }
        />
      </div>
    );
  }

  // ─── Not found ────────────────────────────────────────────
  if (notFound || !project) {
    return (
      <div className="min-h-screen cr-auth-bg flex items-center justify-center p-8">
        <EmptyState
          title="Project Not Found"
          description="This QR code doesn't map to an active project. It may have been removed or the ID is incorrect."
          action={
            <Link to="/" className="cr-btn cr-btn-primary">
              Go to Jan Samadhan Home
            </Link>
          }
        />
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[project.status] ?? { label: project.status, color: 'var(--cr-text-muted)' };
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return (
    <div className="min-h-screen cr-auth-bg">
      {/* Tricolor stripe */}
      <div className="cr-tricolor-bar" />

      {/* Header */}
      <div style={{ backgroundColor: 'var(--cr-blue)' }} className="text-white px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-[var(--cr-blue-mid)] flex items-center justify-center relative">
            <img src="/logo1.jpg" alt="Jan Samadhan" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-[16px] uppercase tracking-wider text-[var(--cr-orange)]">
              Verified Government Project
            </h1>
            <p className="text-[12px] text-white/60 mt-0.5">
              Jan Samadhan — Transparency Portal
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-20">
        {/* Project card */}
        <motion.div
          className="cr-card mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-[20px] font-bold text-[var(--cr-text)] leading-snug">
              {project.title}
            </h2>
            <span
              className="text-[12px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
              style={{
                color: statusInfo.color,
                borderColor: statusInfo.color,
                backgroundColor: `${statusInfo.color}14`,
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          <p className="text-[13.5px] text-[var(--cr-text-muted)] mb-5">
            {project.description}
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'var(--cr-blue-light)' }}
              >
                <HardHat size={18} style={{ color: 'var(--cr-blue-mid)' }} />
              </div>
              <div>
                <p className="text-[11px] text-[var(--cr-text-muted)] uppercase font-bold tracking-wide">
                  Department
                </p>
                <p className="font-semibold text-[14px] text-[var(--cr-text)]">
                  {project.department}
                </p>
              </div>
            </div>

            {project.contractor && (
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'var(--cr-blue-light)' }}
                >
                  <Info size={18} style={{ color: 'var(--cr-blue-mid)' }} />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--cr-text-muted)] uppercase font-bold tracking-wide">
                    Contractor
                  </p>
                  <p className="font-semibold text-[14px] text-[var(--cr-text)]">
                    {project.contractor}
                  </p>
                </div>
              </div>
            )}

            {project.budget != null && (
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'var(--cr-blue-light)' }}
                >
                  <Info size={18} style={{ color: 'var(--cr-blue-mid)' }} />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--cr-text-muted)] uppercase font-bold tracking-wide">
                    Approved Budget
                  </p>
                  <p className="font-semibold text-[14px] text-[var(--cr-text)]">
                    ₹{project.budget.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress card */}
        <motion.div
          className="cr-card mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <p className="cr-section-title mb-3">Completion Status</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--cr-text-muted)]">Overall Progress</span>
            <span
              className="text-[20px] font-bold"
              style={{ color: 'var(--cr-blue-mid)' }}
            >
              {progress}%
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--cr-border)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--cr-blue-mid)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          {project.expected_end_date && (
            <p className="text-[12px] text-[var(--cr-text-muted)] mt-2">
              Expected completion: {new Date(project.expected_end_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-[13px] text-[var(--cr-text-muted)] mb-3">
            Spot an issue near this project site?
          </p>
          <Link
            to="/signup"
            className="cr-btn cr-btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink size={15} />
            Report via Jan Samadhan
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
