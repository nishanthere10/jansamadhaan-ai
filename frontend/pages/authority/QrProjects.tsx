import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { QrCode, Plus, X, AlertCircle, Loader2, Edit3, Printer, Trash2, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import type { QrProject, QrProjectFormData, ApiResponse } from '../../types';
import { toast } from 'sonner';

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

  // Edit & Poster state
  const [editingProject, setEditingProject] = useState<QrProject | null>(null);
  const [editForm, setEditForm] = useState<{ progress_percentage: number; status: string; budget: string }>({
    progress_percentage: 0,
    status: 'planned',
    budget: '',
  });
  const [updating, setUpdating] = useState(false);
  const [posterProject, setPosterProject] = useState<QrProject | null>(null);
  const [posterImgFailed, setPosterImgFailed] = useState(false);

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
        toast.success('QR Project created successfully');
        closeModal();
        load();
      } else {
        const msg = json.detail || json.message || 'Failed to create project.';
        setCreateError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Connection error. Please try again.';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (p: QrProject) => {
    setEditingProject(p);
    setEditForm({
      progress_percentage: p.progress_percentage || 0,
      status: p.status || 'planned',
      budget: p.budget != null ? String(p.budget) : '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/v1/qr-projects/${editingProject.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          progress_percentage: Number(editForm.progress_percentage),
          status: editForm.status,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
        }),
      });
      const json: ApiResponse<QrProject> = await res.json();
      if (res.ok && json.success) {
        toast.success('Project progress updated successfully');
        setEditingProject(null);
        load();
      } else {
        toast.error(json.detail || json.message || 'Failed to update project');
      }
    } catch {
      toast.error('Network error. Failed to update project.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this civic QR project?')) return;
    try {
      const res = await fetchWithAuth(`/api/v1/qr-projects/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Project deleted successfully');
        load();
      } else {
        toast.error(json.detail || json.message || 'Failed to delete project');
      }
    } catch (err) {
      toast.error('Network error. Failed to delete project.');
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
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

              {/* Action buttons */}
              <div className="flex items-center justify-between w-full pt-3 mt-auto border-t border-[var(--cr-border)] gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="text-xs font-semibold text-[var(--cr-blue-mid)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} /> Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosterImgFailed(false);
                    setPosterProject(p);
                  }}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} /> Poster
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto cursor-pointer"
                  title="Delete Project"
                >
                  <Trash2 size={13} />
                </button>
              </div>
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

        {/* Edit / Progress Update Modal */}
        {editingProject && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setEditingProject(null)}
          >
            <motion.div
              className="cr-card w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--cr-text)]">Update Project Progress</h2>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-[var(--cr-text-muted)] hover:text-[var(--cr-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-[var(--cr-text-muted)] mb-4 truncate font-medium">
                {editingProject.title} ({editingProject.department})
              </p>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="cr-label flex justify-between">
                    <span>Progress Percentage</span>
                    <span className="font-bold text-[var(--cr-blue-mid)]">{editForm.progress_percentage}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.progress_percentage}
                    onChange={(e) => setEditForm({ ...editForm, progress_percentage: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="cr-label">Project Status</label>
                  <select
                    className="cr-input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active / In Progress</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="cr-label">Revised Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="cr-input"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="cr-btn cr-btn-secondary"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cr-btn cr-btn-primary"
                    disabled={updating}
                  >
                    {updating ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Printable Civic Poster Modal */}
        {posterProject && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setPosterProject(null)}
          >
            <motion.div
              className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col items-center text-center relative border-4 border-blue-900"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <button
                onClick={() => setPosterProject(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 print:hidden"
              >
                <X size={20} />
              </button>

              <div className="w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-xl mb-2">
                🏛️
              </div>
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-blue-900 mb-1">
                Public Works & Transparency Portal
              </h2>
              <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">
                {posterProject.title}
              </h3>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-4 tracking-wider">
                Department: {posterProject.department}
              </p>

              <div className="border-4 border-slate-900 p-4 rounded-xl bg-slate-50 mb-4 shadow-sm flex items-center justify-center min-h-[192px]">
                {posterProject.qr_code_url && !posterImgFailed ? (
                  <img
                    src={posterProject.qr_code_url}
                    alt="Civic QR Code"
                    className="w-48 h-48 mx-auto"
                    onError={() => setPosterImgFailed(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <QrCode size={140} className="text-slate-800 mb-2" />
                    <span className="text-[11px] font-mono text-slate-600 font-bold max-w-[220px] break-all">
                      {window.location.origin}/track/{posterProject.id}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm font-bold text-slate-800 mb-1">
                Scan with any Smartphone Camera
              </p>
              <p className="text-xs text-slate-500 max-w-xs mb-6">
                To view live project timeline, sanctioned budget, contractor accountability, and citizen progress reports.
              </p>

              <div className="flex gap-3 print:hidden w-full">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPosterProject(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
