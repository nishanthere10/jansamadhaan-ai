import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Camera, MapPin, Loader2, CheckCircle, AlertCircle, X, ShieldAlert, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { Incident, ApiResponse } from '../../types';
import { useTranslation } from '../../lib/useTranslation';

import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Upload proof state per-incident ─────────────────────
interface ResolutionState {
  notes: string;
  proofUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
  resolving: boolean;
  resolveError: string | null;
}

const DEFAULT_RESOLUTION: ResolutionState = {
  notes: '',
  proofUrl: null,
  uploading: false,
  uploadError: null,
  resolving: false,
  resolveError: null,
};

export default function WorkerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<{ status: string; message: string } | null>(null);
  const [resolution, setResolution] = useState<ResolutionState>(DEFAULT_RESOLUTION);
  const { t } = useTranslation();

  const load = async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/incidents');
      const json: ApiResponse<Incident[]> = await res.json();
      if (res.ok && json.success && json.data) {
        setIncidents(json.data);
      } else {
        setFetchError(json.detail || json.message || 'Failed to load tasks.');
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

  const openTask = (incidentId: string) => {
    setActiveTask(incidentId);
    setResolution(DEFAULT_RESOLUTION);
  };

  const closeTask = () => {
    setActiveTask(null);
    setResolution(DEFAULT_RESOLUTION);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validation
    if (!file.type.startsWith('image/')) {
      setResolution((r) => ({ ...r, uploadError: 'Only image files are accepted.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResolution((r) => ({ ...r, uploadError: 'Image must be under 5 MB.' }));
      return;
    }

    setResolution((r) => ({ ...r, uploading: true, uploadError: null }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (!activeTask) return;
      const res = await fetchWithAuth(`/api/v1/incidents/upload?incident_id=${encodeURIComponent(activeTask)}`, {
        method: 'POST',
        body: formData,
      });
      const json: ApiResponse<{ image_url: string }> = await res.json();
      if (res.ok && json.success && json.data) {
        setResolution((r) => ({ ...r, proofUrl: json.data!.image_url, uploading: false }));
      } else {
        setResolution((r) => ({
          ...r,
          uploading: false,
          uploadError: json.detail || json.message || 'Upload failed.',
        }));
      }
    } catch {
      setResolution((r) => ({
        ...r,
        uploading: false,
        uploadError: 'Connection error during upload.',
      }));
    } finally {
      e.target.value = '';
    }
  };

  const resolveTask = async (incidentId: string) => {
    setResolution((r) => ({ ...r, resolving: true, resolveError: null }));

    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'resolved',
          resolution_notes: resolution.notes,
          resolution_image_url: resolution.proofUrl,
        }),
      });
      const json: ApiResponse<{ verification_status: 'verified' | 'rejected' | 'error' }> = await res.json();
      if (res.ok && json.success && json.data) {
        setVerificationNotice({ status: json.data.verification_status, message: json.message });
        closeTask();
        load(); // Refresh the queue
      } else {
        setResolution((r) => ({
          ...r,
          resolving: false,
          resolveError: json.detail || json.message || 'Failed to mark as resolved.',
        }));
      }
    } catch {
      setResolution((r) => ({
        ...r,
        resolving: false,
        resolveError: 'Connection error. Please try again.',
      }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header - Premium UX4G */}
      <motion.div
        className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge variant="outline" className="mb-2 uppercase tracking-wider text-[10px] font-bold text-slate-600 border-slate-300 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
          {t('worker.badge')}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
           {t('worker.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          {user ? <span className="text-slate-700 dark:text-slate-300 font-semibold">{user.full_name}</span> : ''} · {t('worker.subtitle')}
        </p>
      </motion.div>

      {verificationNotice && (
        <div role="status" className="mb-6 rounded-lg border p-4">
          <strong>{verificationNotice.status === 'verified' ? 'Resolution verified' :
            verificationNotice.status === 'rejected' ? 'Proof rejected — rework required' :
              'Verification pending — manual review'}</strong>
          <p>{verificationNotice.message}</p>
        </div>
      )}
      {/* Fetch error */}
      <AnimatePresence>
        {fetchError && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 font-medium text-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{fetchError}</span>
              </div>
              <button onClick={load} className="text-xs uppercase font-bold tracking-wider hover:underline underline-offset-2">
                {t('worker.retryConnection')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          title={t('worker.emptyTitle')}
          description={t('worker.emptyDesc')}
        />
      ) : (
        <motion.div
          className="flex flex-col gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {incidents.map((inc) => (
            <motion.div key={inc.id} variants={cardVariants}>
              <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800 shadow-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all">
                <CardContent className="p-5">
                  {/* Incident header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <Badge variant="secondary" className="font-mono text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                      {inc.tracking_id}
                    </Badge>
                    <StatusBadge status={inc.status} />
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-snug mb-2">
                    {inc.title}
                  </h3>

                  {inc.address && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                      <MapPin size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{inc.address}</span>
                    </div>
                  )}

                  {/* Smart Dispatch / AI Context */}
                  {(inc.ai_department || inc.ai_summary || inc.generated_summary) && (
                    <div className="mb-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 5">
                      <h4 className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BrainCircuit size={14}/> AI Dispatch Notes
                      </h4>
                      <div className="space-y-2">
                        {inc.ai_department && (
                           <div className="flex items-center gap-2 text-[13px]">
                             <span className="font-semibold text-slate-600 dark:text-slate-400">Department:</span>
                             <span className="font-bold text-slate-900 dark:text-slate-200">{inc.ai_department}</span>
                           </div>
                        )}
                        {inc.ai_severity && (
                           <div className="flex items-center gap-2 text-[13px]">
                             <span className="font-semibold text-slate-600 dark:text-slate-400">Predicted Risk:</span>
                             <span className="font-bold text-slate-900 dark:text-slate-200">{inc.ai_severity}</span>
                           </div>
                        )}
                        {(inc.ai_summary || inc.generated_summary) && (
                           <p className="text-[13px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-100 dark:border-slate-800 leading-relaxed italic">
                             "{inc.ai_summary || inc.generated_summary}"
                           </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolution panel */}
                  {inc.status !== 'resolved' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {activeTask !== inc.id ? (
                        <Button
                          onClick={() => openTask(inc.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                        >
                          {t('worker.acknowledge')}
                        </Button>
                      ) : (
                        <motion.div
                          className="space-y-5 bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800"
                          initial={{ opacity: 0, y: 10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-tight flex items-center gap-2">
                              <Camera size={14} className="text-slate-500" /> {t('worker.proofTitle')}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">{t('worker.proofDesc')}</p>
                          </div>

                          {/* Proof upload area */}
                          {!resolution.proofUrl ? (
                            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group bg-white dark:bg-slate-900">
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleProofUpload}
                                disabled={resolution.uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                aria-label="Upload proof of work photo"
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none text-center text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {resolution.uploading ? (
                                  <Loader2 className="animate-spin text-blue-500" size={36} />
                                ) : (
                                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                    <Camera size={28} />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <span className="text-[14px] font-bold block">
                                    {resolution.uploading ? t('worker.processing') : t('worker.tapScan')}
                                  </span>
                                  <span className="text-[11px] font-medium opacity-70 block">
                                    {resolution.uploading ? t('worker.awaitingServer') : t('worker.cameraLaunch')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm bg-white dark:bg-slate-900">
                              <img
                                src={resolution.proofUrl}
                                alt="Proof of resolution"
                                className="w-full h-48 object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setResolution((r) => ({ ...r, proofUrl: null }))}
                                className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md text-white p-2 rounded-full hover:bg-red-500 transition-colors shadow-sm"
                                aria-label="Remove proof image"
                              >
                                <X size={14} strokeWidth={3} />
                              </button>
                              <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-1.5 rounded flex items-center gap-1 shadow-sm tracking-wider">
                                 <MapPin size={10} className="text-emerald-400"/> {t('worker.gpsLocked')}
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-emerald-500 backdrop-blur-md text-white text-xs px-3 py-2.5 flex items-center gap-2 font-bold tracking-wide">
                                <CheckCircle size={16} />
                                {t('worker.proofUploaded')}
                              </div>
                            </div>
                          )}

                          {/* Upload error */}
                          <AnimatePresence>
                            {resolution.uploadError && (
                                <motion.p 
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[13px] text-red-600 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 p-2 rounded-md"
                                >
                                <AlertCircle size={14} />
                                {resolution.uploadError}
                                </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Notes */}
                          <div className="space-y-2">
                             <h4 className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{t('worker.remarks')}</h4>
                             <Textarea
                               className="resize-none text-sm bg-white dark:bg-slate-900"
                               rows={3}
                               placeholder={t('worker.remarksPlaceholder')}
                               value={resolution.notes}
                               onChange={(e) =>
                                 setResolution((r) => ({ ...r, notes: e.target.value }))
                               }
                             />
                          </div>
                          

                          {/* Resolve error */}
                          <AnimatePresence>
                            {resolution.resolveError && (
                                <motion.p 
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[13px] text-red-600 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 p-2 rounded-md"
                                >
                                <AlertCircle size={14} />
                                {resolution.resolveError}
                                </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Actions */}
                          <div className="flex gap-3 pt-2">
                            <Button
                              variant="outline"
                              className="flex-1 font-semibold"
                              onClick={closeTask}
                              disabled={resolution.resolving}
                            >
                              {t('worker.cancel')}
                            </Button>
                            <Button
                              disabled={!resolution.proofUrl || resolution.resolving || resolution.uploading}
                              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => resolveTask(inc.id)}
                            >
                              {resolution.resolving ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="animate-spin" size={16} />
                                  {t('worker.submitting')}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  {t('worker.transmitClose')}
                                </span>
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Already resolved */}
                  {inc.status === 'resolved' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle size={16} />
                      {t('worker.completed')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
