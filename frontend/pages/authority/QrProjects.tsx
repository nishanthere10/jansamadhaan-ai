import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { QrCode, Plus, X, AlertCircle, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import type { QrProject, QrProjectFormData, ApiResponse } from '../../types';

const INITIAL_FORM: QrProjectFormData = {
  title: '',
  description: '',
  department: 'Public Works',
  budget: '',
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const STATUS_STYLE: Record<string, string> = {
  planned:   'cr-badge cr-badge-pending',
  active:    'cr-badge cr-badge-assigned',
  delayed:   'cr-badge cr-badge-rejected',
  completed: 'cr-badge cr-badge-resolved',
  cancelled: 'cr-badge cr-badge-rejected',
};

export default function AuthorityQrProjects() {
  const [projects, setProjects] = useState<QrProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<QrProjectFormData>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/qr-projects');
      const json: ApiResponse<QrProject[]> = await res.json();
      if (res.ok && json.success && json.data) {
        setProjects(json.data);
      } else {
        setFetchError(json.detail || json.message || 'Failed to load projects.');
      }
    } catch {
      setFetchError('Connection error. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setForm(INITIAL_FORM);
    setCreateError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetchWithAuth('/api/v1/qr-projects', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          budget: form.budget ? parseFloat(form.budget) : null,
        }),
      });
      const json: ApiResponse<QrProject> = await res.json();
      if (res.ok && json.success) {
        closeModal();
        load();
      } else {
        setCreateError(json.detail || json.message || 'Failed to create project.');
      }
    } catch {
      setCreateError('Connection error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        className="cr-page-header flex justify-between items-start gap-4 flex-wrap"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="cr-page-title">QR Projects Hub</h1>
          <p className="cr-page-subtitle">
            Manage transparent project tracking codes for public visibility.
          </p>
        </div>

        <motion.button
          onClick={openModal}
          className="cr-btn cr-btn-primary flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          id="create-project-btn"
        >
          <Plus size={16} />
          New Project
        </motion.button>
      </motion.div>

      {/* Fetch error */}
      {fetchError && !loading && (
        <motion.div
          className="cr-error-box mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{fetchError}</span>
          <button
            onClick={load}
            className="ml-auto text-[12px] underline hover:no-underline font-semibold"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first QR-linked project so citizens can scan and track government work in real time."
          action={
            <button onClick={openModal} className="cr-btn cr-btn-primary flex items-center gap-2">
              <Plus size={16} />
              Create First Project
            </button>
          }
        />
      ) : (
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {projects.map((p) => (
            <motion.div
              key={p.id}
              className="cr-card flex flex-col items-center text-center gap-3"
              variants={cardVariants}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
            >
              <div className="flex items-center justify-between w-full">
                <h3
                  className="font-semibold text-[15px] text-[var(--cr-text)] truncate text-left flex-1"
                  title={p.title}
                >
                  {p.title}
                </h3>
                <span className={STATUS_STYLE[p.status] ?? 'cr-badge cr-badge-pending'}>
                  {p.status}
                </span>
              </div>

              <p className="text-[12px] text-[var(--cr-text-muted)] text-left w-full">
                {p.department}
              </p>

              {/* QR Code */}
              <div className="bg-[var(--cr-surface)] border border-[var(--cr-border)] rounded-lg p-3 shadow-sm">
                {p.qr_code_url ? (
                  <img
                    src={p.qr_code_url}
                    alt={`QR code for ${p.title}`}
                    className="w-28 h-28"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center">
                    <QrCode size={80} className="text-[var(--cr-border)]" />
                  </div>
                )}
              </div>

              <p className="text-[12px] text-[var(--cr-text-muted)] line-clamp-2 w-full text-left">
                {p.description}
              </p>

              {/* Progress bar */}
              <div className="w-full mt-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] text-[var(--cr-text-muted)] font-medium">
                    Progress
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: 'var(--cr-blue-mid)' }}
                  >
                    {p.progress_percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--cr-border)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--cr-blue-mid)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progress_percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>

              {p.budget != null && (
                <p className="text-[11px] text-[var(--cr-text-muted)] w-full text-left">
                  Budget: ₹{p.budget.toLocaleString('en-IN')}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              className="cr-card w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-[var(--cr-text)]">Create QR Project</h2>
                <button
                  onClick={closeModal}
                  className="cr-btn cr-btn-ghost p-1.5 rounded-lg"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              {createError && (
                <div className="cr-error-box mb-4">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="proj-title" className="cr-label">Project Title</label>
                  <input
                    id="proj-title"
                    type="text"
                    placeholder="E.g., Ward 12 Road Resurfacing"
                    className="cr-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="proj-desc" className="cr-label">Description</label>
                  <textarea
                    id="proj-desc"
                    placeholder="Brief description of the project scope…"
                    className="cr-input resize-none"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="proj-dept" className="cr-label">Department</label>
                  <input
                    id="proj-dept"
                    type="text"
                    placeholder="E.g., Public Works"
                    className="cr-input"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="proj-budget" className="cr-label">
                    Budget (₹) <span className="text-[var(--cr-text-muted)] font-normal">— Optional</span>
                  </label>
                  <input
                    id="proj-budget"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="E.g., 500000"
                    className="cr-input"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cr-btn cr-btn-secondary"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    className="cr-btn cr-btn-primary"
                    disabled={creating}
                    whileHover={{ scale: creating ? 1 : 1.02 }}
                    whileTap={{ scale: creating ? 1 : 0.98 }}
                  >
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={14} />
                        Creating…
                      </span>
                    ) : (
                      'Create Project'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
