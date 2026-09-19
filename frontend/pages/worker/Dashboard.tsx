import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SeverityBadge } from '../../components/shared/SeverityBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { BeforeAfterViewer } from '../../components/shared/BeforeAfterViewer';
import {
  Camera,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Navigation,
  BrainCircuit,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { Incident, ApiResponse } from '../../types';
import { useTranslation } from '../../lib/useTranslation';

import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

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

type SeverityFilter = 'all' | 'critical' | 'high' | 'other';

export default function WorkerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<{
    status: 'verified' | 'rejected' | 'error' | 'pending';
    message: string;
  } | null>(null);
  const [resolution, setResolution] = useState<ResolutionState>(DEFAULT_RESOLUTION);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
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
        setFetchError(json.detail || json.message || 'Failed to load task queue.');
      }
    } catch {
      setFetchError('Network error. Unable to reach dispatch server.');
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

    if (!file.type.startsWith('image/')) {
      setResolution((r) => ({ ...r, uploadError: 'Only JPEG/PNG image files are accepted.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResolution((r) => ({ ...r, uploadError: 'Photo must be under 5 MB.' }));
      return;
    }

    setResolution((r) => ({ ...r, uploading: true, uploadError: null }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (!activeTask) return;
      const res = await fetchWithAuth(
        `/api/v1/incidents/upload?incident_id=${encodeURIComponent(activeTask)}`,
        {
          method: 'POST',
          body: formData,
        }
      );
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
        uploadError: 'Connection interrupted while uploading photo.',
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
        setVerificationNotice({
          status: json.data.verification_status,
          message: json.message || 'Resolution submitted for municipal verification.',
        });
        closeTask();
        load();
      } else {
        setResolution((r) => ({
          ...r,
          resolving: false,
          resolveError: json.detail || json.message || 'Failed to submit resolution proof.',
        }));
      }
    } catch {
      setResolution((r) => ({
        ...r,
        resolving: false,
        resolveError: 'Network error submitting resolution.',
      }));
    }
  };

  // Severity counts
  const criticalCount = incidents.filter(
    (i) => (i.severity === 'critical' || i.ai_severity === 'critical') && i.status !== 'resolved'
  ).length;

  const highCount = incidents.filter(
    (i) => (i.severity === 'high' || i.ai_severity === 'high') && i.status !== 'resolved'
  ).length;

  const otherCount = incidents.filter(
    (i) =>
      !['critical', 'high'].includes(i.severity) &&
      !['critical', 'high'].includes(i.ai_severity || '') &&
      i.status !== 'resolved'
  ).length;

  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter === 'critical') return inc.severity === 'critical' || inc.ai_severity === 'critical';
    if (severityFilter === 'high') return inc.severity === 'high' || inc.ai_severity === 'high';
    if (severityFilter === 'other')
      return (
        !['critical', 'high'].includes(inc.severity) &&
        !['critical', 'high'].includes(inc.ai_severity || '')
      );
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 sm:px-6">
      {/* Top Header - Mobile Outdoors High Legibility */}
      <div className="mb-6 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Badge
          variant="outline"
          className="mb-2 uppercase tracking-wider text-[10px] font-bold text-slate-700 border-slate-300 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
        >
          Field Operations
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          My Assigned Tasks
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          {user ? <span className="font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</span> : 'Field Worker'} · Municipal Dispatch Console
        </p>
      </div>

      {/* Verification Notice Banner */}
      {verificationNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
            verificationNotice.status === 'verified'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : verificationNotice.status === 'rejected'
              ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
              : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
          }`}
        >
          {verificationNotice.status === 'verified' ? (
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-0.5 flex-1">
            <strong className="block text-sm font-bold">
              {verificationNotice.status === 'verified'
                ? 'Resolution Verified by AI Vision'
                : verificationNotice.status === 'rejected'
                ? 'Proof Rejected — Further Rework Required'
                : 'Resolution Logged — Pending Supervisor Sign-off'}
            </strong>
            <p className="opacity-90">{verificationNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setVerificationNotice(null)}
            className="p-1 hover:opacity-75"
            aria-label="Dismiss notice"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Priority Summary Strip per spec §16 */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSeverityFilter('all')}
          className={`p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
            severityFilter === 'all'
              ? 'border-slate-900 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="text-base sm:text-lg font-black leading-none">{incidents.length}</div>
          <div className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">All</div>
        </button>

        <button
          type="button"
          onClick={() => setSeverityFilter('critical')}
          className={`p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
            severityFilter === 'critical'
              ? 'border-red-600 bg-red-600 text-white shadow-sm'
              : 'border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="text-base sm:text-lg font-black leading-none">{criticalCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">Critical</div>
        </button>

        <button
          type="button"
          onClick={() => setSeverityFilter('high')}
          className={`p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
            severityFilter === 'high'
              ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
              : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
          }`}
        >
          <div className="text-base sm:text-lg font-black leading-none">{highCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">High</div>
        </button>

        <button
          type="button"
          onClick={() => setSeverityFilter('other')}
          className={`p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
            severityFilter === 'other'
              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
              : 'border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
          }`}
        >
          <div className="text-base sm:text-lg font-black leading-none">{otherCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">Other</div>
        </button>
      </div>

      {/* Error state */}
      {fetchError && !loading && (
        <div className="mb-6">
          <ErrorState title="Unable to load tasks" description={fetchError} onRetry={load} />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="animate-spin text-[var(--cr-authority)]" size={32} />
          <span className="text-xs font-semibold">Synchronizing field assignments…</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          title="No tasks in this category"
          description="You are currently caught up with your field assignments. Check back later for new municipal dispatches."
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredIncidents.map((inc) => {
            const hasGps = inc.location_lat != null && inc.location_lng != null;
            const mapsUrl = hasGps
              ? `https://www.google.com/maps/dir/?api=1&destination=${inc.location_lat},${inc.location_lng}`
              : null;
            const isTaskOpen = activeTask === inc.id;

            return (
              <motion.div key={inc.id} variants={cardVariants}>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                  <CardContent className="p-5 space-y-4">
                    {/* Header: Tracking ID + Status & Severity */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {inc.tracking_id}
                      </span>
                    </div>

                    {/* Problem Title & Location */}
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {inc.title}
                      </h2>
                      {inc.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 font-medium">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{inc.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar: Navigate + Resolve */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {mapsUrl && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="font-bold text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"
                        >
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                            <Navigation size={13} className="mr-1.5" />
                            Navigate to Site
                          </a>
                        </Button>
                      )}

                      {inc.status !== 'resolved' && (
                        <Button
                          variant={isTaskOpen ? 'outline' : 'authority'}
                          size="sm"
                          onClick={() => (isTaskOpen ? closeTask() : openTask(inc.id))}
                          className="font-bold text-xs"
                        >
                          {isTaskOpen ? 'Hide Resolution Form' : 'Start Resolution Proof'}
                        </Button>
                      )}
                    </div>

                    {/* RESOLUTION FLOW (OPEN STATE) */}
                    <AnimatePresence>
                      {isTaskOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4"
                        >
                          {/* Side-by-side or Before View */}
                          {inc.image_url && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Original Citizen Photo (Before)
                              </span>
                              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-950">
                                <img
                                  src={inc.image_url}
                                  alt="Original hazard report"
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            </div>
                          )}

                          {/* Upload After Proof */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Resolution Photo Proof (After)
                            </span>

                            {!resolution.proofUrl ? (
                              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-900/60 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleProofUpload}
                                  disabled={resolution.uploading}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                  aria-label="Upload resolution proof"
                                />
                                <div className="flex flex-col items-center gap-2 text-center text-slate-500">
                                  {resolution.uploading ? (
                                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                                  ) : (
                                    <Camera size={28} className="text-emerald-600" />
                                  )}
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {resolution.uploading ? 'Validating photo upload…' : 'Tap to take resolution photo outdoors'}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    GPS geotag will be recorded with proof
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {inc.image_url ? (
                                  <BeforeAfterViewer
                                    beforeSrc={inc.image_url}
                                    afterSrc={resolution.proofUrl}
                                    beforeLabel="Citizen Before"
                                    afterLabel="Worker After"
                                    aiVerified={true}
                                  />
                                ) : (
                                  <div className="relative rounded-xl overflow-hidden border border-emerald-500">
                                    <img
                                      src={resolution.proofUrl}
                                      alt="Proof"
                                      className="w-full h-48 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setResolution((r) => ({ ...r, proofUrl: null }))}
                                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600"
                                      aria-label="Remove photo"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {resolution.uploadError && (
                              <p className="text-xs text-red-600 font-medium">
                                {resolution.uploadError}
                              </p>
                            )}
                          </div>

                          {/* Notes */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Worker Remarks / Work Done
                            </span>
                            <Textarea
                              value={resolution.notes}
                              onChange={(e) => setResolution((r) => ({ ...r, notes: e.target.value }))}
                              placeholder="E.g., Filled with cold bitumen mix, leveled, and compacted. Surface clear for traffic."
                              className="text-xs h-20"
                            />
                          </div>

                          {resolution.resolveError && (
                            <p className="text-xs text-red-600 font-medium">
                              {resolution.resolveError}
                            </p>
                          )}

                          {/* Submit button */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={closeTask}
                              disabled={resolution.resolving}
                              className="flex-1 font-semibold"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              disabled={
                                !resolution.proofUrl || resolution.resolving || resolution.uploading
                              }
                              onClick={() => resolveTask(inc.id)}
                              className="flex-[2] font-bold"
                            >
                              {resolution.resolving ? (
                                <>
                                  <Loader2 size={14} className="animate-spin mr-1.5" />
                                  Submitting for AI Verification…
                                </>
                              ) : (
                                <>
                                  <Check size={14} className="mr-1.5" />
                                  Transmit Resolution Proof
                                </>
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
