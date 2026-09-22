import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  MapPin,
  Sparkles,
  CheckCircle2,
  FileText,
  UserCheck,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Incident, IncidentUpdate } from '../../../types';
import { SlaBadge } from './SlaBadge';
import { SeverityBadge } from '../../../components/shared/SeverityBadge';
import { StatusBadge, statusLabel } from '../../../components/shared/StatusBadge';

interface SplitTriageWorkspaceProps {
  incidents: Incident[];
  workers: { id: string; full_name: string; department?: string; phone_number?: string }[];
  workerWorkloads: Record<string, number>;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  incidentUpdates: Record<string, IncidentUpdate[]>;
  onFastTrackDispatch: (incident: Incident, workerId?: string) => Promise<void>;
  onAssignWorker: (incidentId: string, workerId: string) => Promise<void>;
  onReprocessAI: (incidentId: string) => Promise<void>;
  onStatusChange?: (incidentId: string, status: string, note?: string) => Promise<void>;
}

// Standard Municipal Action Taken Report (ATR) Quick Remark Templates
const MUNICIPAL_ATR_TEMPLATES = [
  'Work completed under Ward Maintenance SOP. Surface leveled and cleared.',
  'Municipal waste lifted; secondary vat sanitized with bleaching powder.',
  'Pipeline leakage repaired and water pressure normalized. Trench backfilled.',
  'Faulty fixture replaced with LED luminaire; operational test passed.',
  'Re-routed to State Electricity Distribution Utility (DISCOM) - outside ULB remit.',
];

export const SplitTriageWorkspace: React.FC<SplitTriageWorkspaceProps> = ({
  incidents,
  workers,
  workerWorkloads,
  selectedIncidentId,
  onSelectIncident,
  incidentUpdates,
  onFastTrackDispatch,
  onAssignWorker,
  onReprocessAI,
  onStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'action'>('evidence');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [atrNote, setAtrNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected incident object
  const activeIncident = useMemo(() => {
    return incidents.find(i => i.id === selectedIncidentId) || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  // Sync selected worker when active incident changes
  React.useEffect(() => {
    if (activeIncident) {
      setSelectedWorkerId(activeIncident.assigned_to || '');
      setAtrNote('');
    }
  }, [activeIncident]);

  // Recommended Worker computation
  const recommendedWorker = useMemo(() => {
    if (!activeIncident || !workers.length) return null;
    const targetDept = (activeIncident.ai_department || activeIncident.category || '').toLowerCase();
    
    // 1. Same department workers
    const deptWorkers = workers.filter(w => 
      (w.department || '').toLowerCase().includes(targetDept) || targetDept.includes((w.department || '').toLowerCase())
    );

    const candidates = deptWorkers.length ? deptWorkers : workers;

    // 2. Sort by least active tasks (workload balance)
    return [...candidates].sort((a, b) => {
      const loadA = workerWorkloads[a.id] || 0;
      const loadB = workerWorkloads[b.id] || 0;
      return loadA - loadB;
    })[0] || null;
  }, [activeIncident, workers, workerWorkloads]);

  const handleFastTrack = async () => {
    if (!activeIncident) return;
    setIsSubmitting(true);
    try {
      await onFastTrackDispatch(activeIncident, recommendedWorker?.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualAssign = async () => {
    if (!activeIncident || !selectedWorkerId) return;
    setIsSubmitting(true);
    try {
      await onAssignWorker(activeIncident.id, selectedWorkerId);
      toast.success('Worker assigned successfully');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogAtr = async (targetStatus?: string) => {
    if (!activeIncident) return;
    setIsSubmitting(true);
    try {
      const statusToSet = targetStatus || activeIncident.status;
      if (onStatusChange) {
        await onStatusChange(activeIncident.id, statusToSet, atrNote.trim() || undefined);
      } else {
        toast.success('ATR Note recorded in municipal log.');
      }
      setAtrNote('');
    } catch {
      toast.error('Failed to update incident record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!incidents.length) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-50" />
        <p className="text-base font-semibold">No incidents found matching current filters</p>
        <p className="text-sm text-slate-400 mt-1">Try relaxing your search query or status filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[680px]">
      {/* ── LEFT PANE: High-Density Incident Stream (5 cols) ── */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Incident Queue ({incidents.length})
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Sorted by Urgency & SLA
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-[360px] lg:max-h-[720px]">
          {incidents.map((inc) => {
            const isSelected = activeIncident?.id === inc.id;
            const hasAi = inc.ai_processing_status === 'completed';
            const isUnassigned = !inc.assigned_to;

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className={`p-3.5 cursor-pointer transition-all duration-150 flex items-start gap-3 relative ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600 dark:border-l-blue-400'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                }`}
              >
                {/* Image Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                  {inc.image_url ? (
                    <img src={inc.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                      No Photo
                    </div>
                  )}
                  {hasAi && (
                    <span className="absolute bottom-0 right-0 p-0.5 bg-blue-600 text-white rounded-tl" title="AI Analyzed">
                      <Sparkles size={10} />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {inc.tracking_id || inc.id.slice(0, 8)}
                    </span>
                    <SlaBadge
                      createdAt={inc.created_at}
                      category={inc.category}
                      severity={inc.severity}
                      status={inc.status}
                    />
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate mb-1">
                    {inc.title || inc.generated_title || 'Civic Incident'}
                  </h4>

                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                    {isUnassigned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANE: Instant Inspector & Fast-Track Dispatch (7 cols) ── */}
      <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {activeIncident ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeIncident.tracking_id || activeIncident.id}
                    </span>
                    <SeverityBadge severity={activeIncident.severity} />
                    <StatusBadge status={activeIncident.status} />
                    <SlaBadge
                      createdAt={activeIncident.created_at}
                      category={activeIncident.category}
                      severity={activeIncident.severity}
                      status={activeIncident.status}
                    />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {activeIncident.title || activeIncident.generated_title || 'Civic Incident Report'}
                  </h2>
                </div>

                {/* Quick Reprocess Action */}
                <button
                  onClick={() => onReprocessAI(activeIncident.id)}
                  title="Re-run AI Analysis"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Location pill */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{activeIncident.address || 'Location coordinates logged'}</span>
                {activeIncident.location_lat && activeIncident.location_lng && (
                  <a
                    href={`https://www.google.com/maps?q=${activeIncident.location_lat},${activeIncident.location_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px] ml-1 shrink-0"
                  >
                    Maps <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {/* 1-Click Fast-Track Dispatch Action Bar (Prominent Banner) */}
            {activeIncident.status !== 'resolved' && (
              <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-b border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        1-Click AI Fast-Track
                      </span>
                      {recommendedWorker && (
                        <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                          → Recommend: <strong>{recommendedWorker.full_name}</strong>
                          <span className="text-slate-400 ml-1 font-normal">
                            ({workerWorkloads[recommendedWorker.id] || 0} active)
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Instantly approve AI classification, assign best worker, and dispatch.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFastTrack}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{isSubmitting ? 'Dispatching...' : 'Fast-Track Dispatch'}</span>
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-4 bg-white dark:bg-slate-900">
              <button
                onClick={() => setActiveTab('evidence')}
                className={`pb-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'evidence'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles size={13} />
                <span>AI Evidence & Photo</span>
              </button>
              <button
                onClick={() => setActiveTab('action')}
                className={`pb-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'action'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck size={13} />
                <span>Manual Assignment & ATR</span>
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={13} />
                <span>Audit Timeline ({incidentUpdates[activeIncident.id]?.length || 0})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[520px]">
              <AnimatePresence mode="wait">
                {activeTab === 'evidence' && (
                  <motion.div
                    key="evidence"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Visual Photo Card */}
                    {activeIncident.image_url ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 max-h-64 flex items-center justify-center relative group">
                        <img
                          src={activeIncident.image_url}
                          alt="Reported Incident"
                          className="w-full h-64 object-contain"
                        />
                        <a
                          href={activeIncident.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/70 hover:bg-black text-white text-[11px] font-medium flex items-center gap-1 backdrop-blur-sm transition"
                        >
                          View Full Res <ExternalLink size={11} />
                        </a>
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                        No photograph provided with this complaint
                      </div>
                    )}

                    {/* AI Structured Findings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Detected Category
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Building2 size={13} className="text-blue-600" />
                          {activeIncident.ai_category || activeIncident.category || 'Unclassified'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Target Department
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-emerald-600" />
                          {activeIncident.ai_department || 'General Municipal Services'}
                        </p>
                      </div>
                    </div>

                    {/* Objective AI Vision Summary */}
                    {activeIncident.ai_vision_analysis && (
                      <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                          <Sparkles size={12} /> Objective Visual Analysis
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {activeIncident.ai_vision_analysis}
                        </p>
                      </div>
                    )}

                    {/* Original Citizen Description */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Citizen Description
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeIncident.description || activeIncident.original_text || 'No text provided'}
                      </p>
                      {activeIncident.translated_text && (
                        <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 italic">
                          Translated: {activeIncident.translated_text}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'action' && (
                  <motion.div
                    key="action"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Worker Selector */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Assign Field Worker / Sanitary Inspector
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={selectedWorkerId}
                          onChange={(e) => setSelectedWorkerId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Choose Field Worker --</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.full_name} ({w.department || 'General'}) — {workerWorkloads[w.id] || 0} active tasks
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={handleManualAssign}
                          disabled={isSubmitting || !selectedWorkerId}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <UserCheck size={14} />
                          <span>Assign</span>
                        </button>
                      </div>

                      {/* Current Assignment display */}
                      {activeIncident.assigned_to && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>
                            Currently assigned to:{' '}
                            <strong>
                              {workers.find(w => w.id === activeIncident.assigned_to)?.full_name || 'Assigned Worker'}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pre-canned Municipal Action Taken Report (ATR) Templates */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Action Taken Report (ATR) Quick Remarks
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {MUNICIPAL_ATR_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setAtrNote(tmpl)}
                            className="px-2.5 py-1 rounded text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-left"
                          >
                            + {tmpl.slice(0, 45)}...
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={atrNote}
                        onChange={(e) => setAtrNote(e.target.value)}
                        placeholder="Type formal municipal remarks or select a template above..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {atrNote.trim() && (
                        <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleLogAtr()}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                          >
                            <Send size={12} /> Log Note Only
                          </button>

                          {activeIncident.status !== 'in-progress' && (activeIncident.status as string) !== 'in_progress' && activeIncident.status !== 'resolved' && (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleLogAtr('in-progress')}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                            >
                              <Zap size={12} /> Mark In-Progress
                            </button>
                          )}

                          {activeIncident.status !== 'resolved' && (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleLogAtr('resolved')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Resolve with ATR
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {incidentUpdates[activeIncident.id]?.length ? (
                      <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800">
                        {incidentUpdates[activeIncident.id].map((update, idx) => (
                          <div key={update.id || idx} className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {update.status ? `Status changed to ${statusLabel(update.status)}` : 'Incident Update'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(update.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {update.note && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700">
                                {update.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No historical updates logged yet for this incident.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
            Select an incident from the queue on the left to inspect and dispatch.
          </div>
        )}
      </div>
    </div>
  );
};
