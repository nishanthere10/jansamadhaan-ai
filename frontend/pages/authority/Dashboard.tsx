import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SeverityBadge } from '../../components/shared/SeverityBadge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

import {
  ChevronDown, Sparkles, BrainCircuit, CheckCircle2, Activity, Camera,
  MapPin, Map, Clock, RefreshCw, RotateCcw, AlertTriangle, Zap,
  Search, UserCheck, X, Layers, ShieldCheck, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import type { Incident, IncidentUpdate } from '../../types';

export default function AuthorityDashboard() {

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<Record<string, IncidentUpdate[]>>({});
  const [workers, setWorkers] = useState<{id: string, full_name: string, department?: string}[]>([]);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(new Set());
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAssign, setConfirmAssign] = useState<{incidentId: string, workerId: string} | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Time Ago Helper ─────────────────────────────────────
  const timeAgo = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const timeAgoColor = (inc: Incident) => {
    if (inc.status === 'resolved' || inc.status === 'rejected') return 'var(--cr-text-muted)';
    const hrs = (Date.now() - new Date(inc.created_at).getTime()) / 3600000;
    if (hrs > 24) return 'var(--cr-red)';
    if (hrs > 6) return 'var(--cr-amber)';
    return 'var(--cr-text-muted)';
  };

  // ── Data Loading ─────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/v1/incidents');
      const json = await res.json();
      if (json.success) {
        setIncidents(json.data);
        // Clear reprocessing flags for completed ones
        setReprocessingIds(prev => {
          const next = new Set(prev);
          json.data.forEach((inc: Incident) => {
            if (inc.ai_processing_status === 'completed' || inc.ai_processing_status === 'failed') {
              next.delete(inc.id);
            }
          });
          return next;
        });
      }
      const workerRes = await fetchWithAuth('/api/v1/auth/workers');
      const workerJson = await workerRes.json();
      if (workerJson.success) {
        setWorkers(workerJson.data);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Auto-poll every 8s when any incident is processing
  useEffect(() => {
    const hasProcessing = incidents.some(
      i => i.ai_processing_status === 'processing' || i.ai_processing_status === 'pending'
    ) || reprocessingIds.size > 0;

    if (hasProcessing) {
      pollingRef.current = setInterval(load, 8000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [incidents, reprocessingIds, load]);

  // ── Expand Row ───────────────────────────────────────────
  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!incidentUpdates[id]) {
      try {
        const res = await fetchWithAuth(`/api/v1/incidents/${id}/updates`);
        const json = await res.json();
        if (json.success) {
          setIncidentUpdates(prev => ({ ...prev, [id]: json.data }));
        }
      } catch {
        console.error('Failed to load updates');
      }
    }
  };

  // ── Assign Worker ────────────────────────────────────────
  const assignWorker = async (incidentId: string, workerId: string) => {
    if (!workerId) return;
    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'assigned', worker_id: workerId }),
      });
      const json = await res.json();
      if (json.success) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId ? { ...inc, status: 'assigned', assigned_to: workerId } : inc
          )
        );
      }
    } catch {
      console.error('Assignment failed');
    }
  };

  // ── Accept AI Triage ─────────────────────────────────────
  const acceptAiTriage = async (incident: Incident) => {
    const payload: Record<string, string> = {};
    if (incident.ai_category) payload.category = incident.ai_category;
    if (incident.ai_severity) payload.severity = incident.ai_severity.toLowerCase();
    if (incident.ai_department) payload.department = incident.ai_department;

    if (Object.keys(payload).length === 0) return;

    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incident.id}/triage`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('AI Triage accepted and saved.');
        setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, ...payload } as Incident : i));
      } else {
        toast.error('Failed to save AI Triage');
      }
    } catch {
      toast.error('Failed to communicate with server');
    }
  };

  // ── Re-trigger AI Pipeline ──────────────────────────────
  const reprocessAI = async (incidentId: string) => {
    setReprocessingIds(prev => new Set(prev).add(incidentId));
    // Optimistic update
    setIncidents(prev => prev.map(i =>
      i.id === incidentId ? { ...i, ai_processing_status: 'processing' } : i
    ));
    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incidentId}/reprocess`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) {
        console.error('Reprocess failed:', json);
        setReprocessingIds(prev => { const n = new Set(prev); n.delete(incidentId); return n; });
      }
    } catch (err) {
      console.error('Reprocess failed:', err);
      setReprocessingIds(prev => { const n = new Set(prev); n.delete(incidentId); return n; });
    }
  };

  // ── Batch Actions ───────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map(i => i.id)));
    }
  };

  const batchAcceptTriage = async () => {
    const targets = incidents.filter(i => selectedIds.has(i.id) && (i.ai_category || i.ai_severity));
    let ok = 0;
    for (const inc of targets) {
      try { await acceptAiTriage(inc); ok++; } catch { /* skip */ }
    }
    toast.success(`Accepted AI triage for ${ok} incident(s)`);
    setSelectedIds(new Set());
    load();
  };

  const batchAssignWorker = async (workerId: string) => {
    let ok = 0;
    for (const id of selectedIds) {
      try { await assignWorker(id, workerId); ok++; } catch { /* skip */ }
    }
    toast.success(`Assigned ${ok} incident(s)`);
    setSelectedIds(new Set());
    load();
  };

  const resetFilters = () => {
    setFilterRisk('all');
    setFilterDept('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  const filtersActive = filterRisk !== 'all' || filterDept !== 'all' || filterStatus !== 'all' || searchQuery !== '';

  // ── Helpers ──────────────────────────────────────────────
  const isAiPending = (inc: Incident) =>
    inc.ai_processing_status === 'processing' || inc.ai_processing_status === 'pending' || reprocessingIds.has(inc.id);
  const isAiFailed = (inc: Incident) =>
    inc.ai_processing_status === 'failed' && !reprocessingIds.has(inc.id);
  const isAiDone = (inc: Incident) =>
    inc.ai_processing_status === 'completed';

  // Sort and filter incidents
  const filteredIncidents = incidents
    .filter(inc => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${inc.tracking_id} ${inc.title} ${inc.description} ${inc.address || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Risk Filter
      if (filterRisk !== 'all') {
        const incRisk = (inc.ai_severity || inc.severity || '').toLowerCase();
        if (filterRisk === 'emergency' && !incRisk.includes('emergency') && !incRisk.includes('critical')) return false;
        if (filterRisk === 'high' && !incRisk.includes('high')) return false;
        if (filterRisk === 'medium' && !incRisk.includes('medium')) return false;
        if (filterRisk === 'low' && !incRisk.includes('low')) return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && inc.status !== filterStatus) return false;

      // Dept Filter
      if (filterDept !== 'all') {
        const dept = (inc.ai_department || 'unassigned').toLowerCase();
        if (filterDept === 'unassigned' && inc.ai_department) return false;
        if (filterDept !== 'unassigned' && dept !== filterDept) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 1. Unprocessed pending first
      if (!isAiDone(a) && isAiDone(b)) return -1;
      if (isAiDone(a) && !isAiDone(b)) return 1;
      // 2. Clustered incidents with more duplicates rank higher
      const dupA = a.duplicate_count || 0;
      const dupB = b.duplicate_count || 0;
      if (dupA !== dupB) return dupB - dupA;
      // 3. Sort by priority score if available
      const scoreA = a.priority_score || 0;
      const scoreB = b.priority_score || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      // 4. Date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Extract unique departments for the filter dropdown
  const uniqueDepartments = Array.from(new Set(incidents.map(i => i.ai_department).filter(Boolean))) as string[];

  // ── Stats (reflect filtered view) ──────────────────────
  const counts = {
    total: filtersActive ? `${filteredIncidents.length} of ${incidents.length}` : `${incidents.length}`,
    pending: filteredIncidents.filter((i) => i.status === 'pending').length,
    inProgress: filteredIncidents.filter((i) => i.status === 'in-progress').length,
    critical: filteredIncidents.filter((i) => i.severity === 'critical' || i.ai_severity === 'Critical').length,
    clustered: filteredIncidents.filter((i) => (i.duplicate_count || 0) > 0).length,
  };

  const workerName = (id: string | null | undefined) => {
    if (!id) return null;
    return workers.find(w => w.id === id)?.full_name || null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <motion.div className="cr-page-header" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="cr-page-title flex items-center gap-2"><BrainCircuit size={28} className="text-[var(--cr-blue-mid)]"/> Command Center</h1>
        <p className="cr-page-subtitle">Monitor, triage and assign civic incidents with AI Assistance.</p>
      </motion.div>

      {!loading && (
        <motion.div className="grid grid-cols-2 md:grid-cols-5 gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {[
            { label: 'Total Reports', value: counts.total, color: 'var(--cr-blue-mid)' },
            { label: 'Pending Review', value: counts.pending, color: 'var(--cr-amber)' },
            { label: 'Active Dispatches', value: counts.inProgress, color: '#2563EB' },
            { label: 'Critical Alert', value: counts.critical, color: 'var(--cr-red)' },
            { label: 'Clustered', value: counts.clustered, color: '#EA580C' },
          ].map((stat) => (
             <motion.div key={stat.label} className="cr-stat-card border-none bg-[var(--cr-surface)] shadow-md shadow-[var(--cr-bg-offset)] ring-1 ring-[var(--cr-border)]" whileHover={{ y: -3 }}>
               <div className="text-[26px] font-bold leading-none mb-1" style={{ color: stat.color }}>{stat.value}</div>
               <div className="text-[12px] text-[var(--cr-text-muted)] font-medium uppercase tracking-wider">{stat.label}</div>
             </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div className="cr-card p-0 overflow-hidden shadow-lg border border-[var(--cr-border)]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="px-5 py-4 border-b border-[var(--cr-border)] bg-[var(--cr-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--cr-text)] flex items-center gap-2"><Sparkles size={16} className="text-[var(--cr-primary)]"/> Smart Triage Queue</h2>
            <div className="flex items-center gap-2">
              <button onClick={load} className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--cr-border)] text-[var(--cr-text)] hover:bg-[var(--cr-bg)] transition-colors" title="Refresh">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <span className="text-[12px] font-bold text-[var(--cr-blue-mid)] bg-[var(--cr-blue-light)] px-2 py-0.5 rounded-full">{filteredIncidents.length} Tickets</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="relative flex-1 min-w-[200px]">
               <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)]" />
               <input
                 type="text"
                 placeholder="Search tracking ID, title, address..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="text-[12px] w-full bg-[var(--cr-bg)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded pl-8 pr-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)] placeholder:text-[var(--cr-text-muted)]"
               />
             </div>
             <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="text-[12px] bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]">
               <option value="all">All Risks</option>
               <option value="emergency">Emergency</option>
               <option value="high">High Risk</option>
               <option value="medium">Medium Risk</option>
               <option value="low">Low Risk</option>
             </select>
             <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-[12px] bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]">
               <option value="all">All Statuses</option>
               <option value="pending">Pending</option>
               <option value="assigned">Assigned</option>
               <option value="in-progress">In Progress</option>
               <option value="resolved">Resolved</option>
             </select>
             <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="text-[12px] bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]">
               <option value="all">All Departments</option>
               <option value="unassigned">Unassigned</option>
               {uniqueDepartments.map(d => (
                 <option key={d} value={d.toLowerCase()}>{d}</option>
               ))}
             </select>
             {filtersActive && (
               <button onClick={resetFilters} className="text-[11px] flex items-center gap-1 px-2 py-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors border border-red-200">
                 <X size={12} /> Reset
               </button>
             )}
          </div>
        </div>

        {loading ? <LoadingSpinner size="lg" /> : (
          <div className="overflow-x-auto">
             <table className="cr-table w-full text-left border-collapse">
               <thead>
                 <tr className="bg-[var(--cr-bg)] text-[11px] uppercase tracking-wider text-[var(--cr-text-muted)]">
                    <th className="font-semibold p-4 w-10">
                      <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredIncidents.length} onChange={toggleSelectAll} className="rounded border-[var(--cr-border)] accent-[var(--cr-primary)] cursor-pointer" title="Select all" />
                    </th>
                    <th className="font-semibold p-4">Tracking ID</th>
                    <th className="font-semibold p-4">Title</th>
                    <th className="font-semibold p-4">Severity Context</th>
                    <th className="font-semibold p-4">AI Status</th>
                    <th className="font-semibold p-4">Status</th>
                    <th className="font-semibold p-4">Assigned To</th>
                    <th className="font-semibold p-4">Reported</th>
                    <th className="font-semibold p-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[var(--cr-border)]">
                 {filteredIncidents.map((inc) => (
                    <React.Fragment key={inc.id}>
                       <tr className={`cursor-pointer transition-colors ${selectedIds.has(inc.id) ? 'bg-[var(--cr-blue-light)]/30' : expandedId === inc.id ? 'bg-[var(--cr-blue-light)]/20' : 'hover:bg-[var(--cr-surface)]'}`} onClick={() => handleExpand(inc.id)}>
                         <td className="p-4" onClick={(e) => e.stopPropagation()}>
                           <input type="checkbox" checked={selectedIds.has(inc.id)} onChange={() => toggleSelect(inc.id)} className="rounded border-[var(--cr-border)] accent-[var(--cr-primary)] cursor-pointer" />
                         </td>
                         <td className="p-4">
                           <span className="font-mono text-[12px] font-bold text-[var(--cr-text)]">{inc.tracking_id}</span>
                         </td>
                         <td className="p-4">
                           <div className="font-semibold text-[14px] text-[var(--cr-text)] flex items-center gap-2">
                              {inc.title}
                              {inc.ai_structured_data ? (
                                inc.ai_structured_data.is_spam ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold border border-red-200" title={`Reason: ${inc.ai_structured_data.spam_reason}`}>
                                    <AlertTriangle size={10} /> Likely Spam
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold border border-green-200" title="Integrity Gatekeeper: Passed">
                                    <CheckCircle2 size={10} /> Verified Genuine
                                  </span>
                                )
                              ) : null}
                           </div>
                           <div className="text-[12px] text-[var(--cr-text-muted)] mt-0.5 truncate max-w-[200px]">{inc.description}</div>
                           {/* Phase 3: Cluster Badge */}
                           {(inc.duplicate_count != null && inc.duplicate_count > 0) && (
                             <div className="flex items-center gap-1.5 mt-1.5">
                               <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">
                                 🔥 {inc.duplicate_count} Related Complaint{inc.duplicate_count > 1 ? 's' : ''}
                               </span>
                               {inc.is_primary_incident && (
                                 <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                                   Primary
                                 </span>
                               )}
                             </div>
                           )}
                         </td>
                           <td className="p-4">
                             <div className="flex flex-col gap-1.5">
                               <SeverityBadge severity={inc.severity} />
                               {(inc.priority_score !== undefined && inc.priority_score !== null) && (
                                 <div className="text-[10px] text-[var(--cr-text-muted)] font-medium flex items-center gap-1">
                                   <Activity size={10} /> Priority Score: {Math.round(inc.priority_score * 100)}/100
                                 </div>
                               )}
                               {inc.ai_severity && inc.ai_severity.toLowerCase() !== inc.severity.toLowerCase() && (
                                 <div className="text-[10px] text-[var(--cr-amber)] font-bold">AI Suggests: {inc.ai_severity}</div>
                               )}
                             </div>
                           </td>
                         {/* AI Processing Status Column */}
                         <td className="p-4">
                           {isAiPending(inc) && (
                             <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-200 animate-pulse">
                               <Zap size={10} /> Processing
                             </span>
                           )}
                           {isAiDone(inc) && (
                             <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold border border-green-200">
                               <CheckCircle2 size={10} /> Complete
                             </span>
                           )}
                           {isAiFailed(inc) && (
                             <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200">
                               <AlertTriangle size={10} /> Failed
                             </span>
                           )}
                           {!inc.ai_processing_status && (
                             <span className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-semibold border border-gray-200">
                               — None
                             </span>
                           )}
                         </td>
                         <td className="p-4"><StatusBadge status={inc.status} /></td>
                         <td className="p-4">
                           {workerName(inc.assigned_to) ? (
                             <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
                               <UserCheck size={10} /> {workerName(inc.assigned_to)}
                             </span>
                           ) : (
                             <span className="text-[11px] text-[var(--cr-text-muted)] italic border border-dashed border-[var(--cr-border)] px-2 py-0.5 rounded-full">Unassigned</span>
                           )}
                         </td>
                         <td className="p-4">
                           <span className="text-[11px] font-medium" style={{ color: timeAgoColor(inc) }}>
                             <Clock size={10} className="inline mr-1" />{timeAgo(inc.created_at)}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                           <ChevronDown size={18} className={`inline-block text-[var(--cr-text-muted)] transition-transform ${expandedId === inc.id ? 'rotate-180' : ''}`}/>
                         </td>
                       </tr>
                       
                       {/* Expanded AI Panel */}
                       <AnimatePresence>
                         {expandedId === inc.id && (
                           <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[var(--cr-bg)] border-b border-[var(--cr-border)] overflow-hidden box-border">
                              <td colSpan={9} className="p-0">
                                <div className="p-5 border-l-4 border-[var(--cr-primary)] ml-4 my-4 bg-[var(--cr-surface)] rounded-r-xl shadow-sm space-y-6">
                                   
                                   <div className="grid md:grid-cols-3 gap-6">
                                     {/* Column 1: Location & Details */}
                                     <div className="flex flex-col gap-4">
                                       <div className="flex items-center gap-2 border-b border-[var(--cr-border)] pb-2 mb-2">
                                          <MapPin size={16} className="text-[var(--cr-primary)]" />
                                          <h3 className="font-bold text-[14px]">Location & Details</h3>
                                       </div>
                                       <div className="bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] text-[12px] space-y-2">
                                         <div>
                                            <span className="font-semibold text-[var(--cr-text-muted)] block">Reported Address</span>
                                            <span className="text-[var(--cr-text)] font-medium block mt-1">{inc.address || 'No address provided'}</span>
                                         </div>
                                         {(inc.location_lat && inc.location_lng) && (
                                            <a href={`https://www.google.com/maps?q=${inc.location_lat},${inc.location_lng}`} target="_blank" rel="noreferrer" className="cr-btn cr-btn-secondary text-[11px] py-1.5 flex items-center justify-center gap-1.5 mt-2 w-full">
                                              <Map size={12}/> View on Maps
                                            </a>
                                         )}
                                       </div>
                                       <div>
                                          <span className="font-semibold text-[var(--cr-text-muted)] text-[11px] uppercase tracking-wider block mb-1">Citizen Report Original</span>
                                          <div className="text-[12px] text-[var(--cr-text)] bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] italic">"{inc.original_text || inc.description}"</div>
                                       </div>
                                     </div>

                                     {/* Column 2: AI Execution Trace */}
                                     <div className="flex flex-col gap-4">
                                       <div className="flex items-center justify-between border-b border-[var(--cr-border)] pb-2 mb-2">
                                          <div className="flex items-center gap-2">
                                            <Activity size={16} className="text-[var(--cr-primary)]" />
                                            <h3 className="font-bold text-[14px]">AI Execution Trace</h3>
                                          </div>
                                          {isAiPending(inc) && (
                                            <span className="flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-200 animate-pulse">
                                              <LoadingSpinner size="sm" /> Processing...
                                            </span>
                                          )}
                                          {isAiFailed(inc) && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); reprocessAI(inc.id); }}
                                              className="flex items-center gap-1.5 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200 hover:bg-red-100 transition-colors"
                                            >
                                              <RotateCcw size={10} /> Re-run AI
                                            </button>
                                          )}
                                       </div>
                                       
                                       {/* Step 1: Vision Pipeline */}
                                       {inc.image_url && (
                                         <div className="flex gap-4 items-start">
                                           <div className="flex flex-col items-center gap-1 mt-1">
                                              <div className="w-5 h-5 rounded-full bg-[var(--cr-primary)] flex items-center justify-center text-white text-[10px]"><Camera size={10} /></div>
                                              <div className="w-0.5 h-full bg-[var(--cr-border)] min-h-[40px]"></div>
                                           </div>
                                           <div className="flex-1 pb-4">
                                              <h4 className="text-[12px] font-bold text-[var(--cr-text)] flex items-center gap-1">
                                                1. Vision Pipeline
                                                <span className="bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] text-[10px] px-1.5 py-0.5 rounded ml-auto">Llama-4-Scout</span>
                                              </h4>
                                              <div className="flex gap-3 mt-2">
                                                <a href={inc.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                                  <img src={inc.image_url} alt="Evidence" className="w-[80px] h-[60px] object-cover rounded border border-[var(--cr-border)] hover:opacity-80 transition-opacity" />
                                                </a>
                                                <div className="text-[11px] text-[var(--cr-text-muted)] bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] w-full relative">
                                                  {inc.ai_structured_data?.safety_hazard && (
                                                    <div className="absolute top-2 right-2 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm">
                                                      <AlertTriangle size={10} /> Hazard Detected
                                                    </div>
                                                  )}
                                                  <span className="font-semibold text-[var(--cr-text)] block mb-1">Sightings:</span>
                                                  {isAiPending(inc) ? (
                                                    <span className="text-amber-600 font-medium flex items-center gap-1">
                                                      <LoadingSpinner size="sm" /> Vision analysis in progress...
                                                    </span>
                                                  ) : (
                                                    <div className="space-y-2">
                                                      <span className="line-clamp-3">
                                                        {inc.ai_vision_analysis || <span className="italic text-[var(--cr-text-muted)]">No vision data available.</span>}
                                                      </span>
                                                      
                                                      {inc.ai_structured_data && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                          {inc.ai_structured_data.estimated_size && (
                                                            <span className="bg-[var(--cr-surface)] text-[var(--cr-text)] px-1.5 py-0.5 rounded border border-[var(--cr-border)] shadow-sm">
                                                              Size: <span className="font-semibold text-[var(--cr-primary)]">{inc.ai_structured_data.estimated_size}</span>
                                                            </span>
                                                          )}
                                                          {inc.ai_structured_data?.has_visible_damage && (
                                                            <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 shadow-sm font-medium">
                                                              Visible Damage
                                                            </span>
                                                          )}
                                                          {inc.ai_structured_data.objects_detected?.map(obj => (
                                                            <span key={obj} className="bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] px-1.5 py-0.5 rounded border border-[var(--cr-primary)]/20 shadow-sm">{obj}</span>
                                                          ))}
                                                        </div>
                                                      )}
                                                      
                                                      {inc.ai_structured_data?.hazard_description && inc.ai_structured_data.hazard_description !== 'None' && (
                                                         <div className="mt-2 text-red-700 bg-red-50 p-2 rounded border border-red-100">
                                                           <span className="font-semibold block mb-0.5 flex items-center gap-1"><AlertTriangle size={10}/> Hazard Details:</span>
                                                           {inc.ai_structured_data.hazard_description}
                                                         </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                           </div>
                                         </div>
                                       )}

                                       {/* Step 2: Translation */}
                                       <div className="flex gap-4 items-start">
                                         <div className="flex flex-col items-center gap-1 mt-1">
                                            <div className="w-5 h-5 rounded-full bg-[var(--cr-primary)] flex items-center justify-center text-white text-[10px]">{inc.audio_url ? '🎶' : 'A'}</div>
                                            <div className="w-0.5 h-full bg-[var(--cr-border)] min-h-[20px] last:bg-transparent"></div>
                                         </div>
                                         <div className="flex-1 pb-4">
                                            <h4 className="text-[12px] font-bold text-[var(--cr-text)] flex items-center gap-1">
                                              2. Translation
                                            </h4>
                                            
                                            {isAiPending(inc) ? (
                                              <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-2">
                                                <LoadingSpinner size="sm" /> Analysis in progress...
                                              </div>
                                            ) : (!inc.translated_text && !inc.transcript_text) ? (
                                              <div className="text-[11px] text-[var(--cr-text-muted)] italic mt-2 flex items-center gap-1">
                                                <Sparkles size={12} className="text-[var(--cr-primary)]" />
                                                Native text matches English. No translation required.
                                              </div>
                                            ) : (
                                              <div className="text-[11px] bg-[var(--cr-bg)] p-2 rounded-md border border-[var(--cr-border)] mt-2">
                                                {inc.translated_text && (
                                                  <div>
                                                    <span className="font-semibold text-[var(--cr-text)] block mb-0.5">English:</span> 
                                                    <span className="text-[var(--cr-text-muted)]">{inc.translated_text}</span>
                                                  </div>
                                                )}
                                                {inc.transcript_text && (
                                                  <div className="mt-2">
                                                    <span className="font-semibold text-amber-600 block mb-0.5">Transcript:</span> 
                                                    <span className="text-[var(--cr-text-muted)]">{inc.transcript_text}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                         </div>
                                       </div>
                                       {/* Step 3: Integrity Gatekeeper */}
                                       {inc.ai_structured_data && (
                                         <div className="flex gap-4 items-start">
                                           <div className="flex flex-col items-center gap-1 mt-1">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${inc.ai_structured_data.is_spam ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                {inc.ai_structured_data.is_spam ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                                              </div>
                                           </div>
                                           <div className="flex-1 pb-4">
                                              <h4 className={`text-[12px] font-bold flex items-center gap-1 ${inc.ai_structured_data.is_spam ? 'text-red-700' : 'text-green-700'}`}>
                                                3. Integrity Gatekeeper
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ml-auto ${inc.ai_structured_data.is_spam ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                  {inc.ai_structured_data.is_spam ? 'Flagged Spam' : 'Passed'}
                                                </span>
                                              </h4>
                                              <div className={`text-[11px] p-3 rounded-md border mt-2 shadow-sm ${inc.ai_structured_data.is_spam ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                <div className={`flex items-center justify-between font-bold mb-1 ${inc.ai_structured_data.is_spam ? 'text-red-800' : 'text-green-800'}`}>
                                                  <span>{inc.ai_structured_data.is_spam ? 'Detection Reason:' : 'Analysis Result:'}</span>
                                                  {inc.ai_structured_data.spam_score !== undefined && (
                                                    <span>Score: {inc.ai_structured_data.spam_score}/10</span>
                                                  )}
                                                </div>
                                                <div className={`leading-relaxed italic ${inc.ai_structured_data.is_spam ? 'text-red-700' : 'text-green-700'}`}>
                                                  {inc.ai_structured_data.is_spam 
                                                    ? `"${inc.ai_structured_data.spam_reason}"` 
                                                    : "The content appears legitimate and meets system integrity guidelines."}
                                                </div>
                                              </div>
                                           </div>
                                         </div>
                                       )}
                                     </div>

                                     {/* Column 3: AI Insights */}
                                     <div className="bg-[var(--cr-blue-light)]/20 p-4 rounded-xl border border-[var(--cr-primary)]/20">
                                        <h4 className="text-[13px] font-bold text-[var(--cr-primary)] flex items-center gap-1.5 mb-3"><Sparkles size={14}/> AI Extraction details</h4>
                                        
                                        {isAiPending(inc) ? (
                                          <div className="flex flex-col items-center justify-center py-8 gap-3">
                                            <LoadingSpinner size="md" />
                                            <span className="text-[12px] text-amber-600 font-semibold">AI Pipeline Running...</span>
                                            <span className="text-[10px] text-[var(--cr-text-muted)]">Results will appear automatically</span>
                                          </div>
                                        ) : isAiFailed(inc) ? (
                                          <div className="flex flex-col items-center justify-center py-6 gap-3">
                                            <AlertTriangle size={24} className="text-red-400" />
                                            <span className="text-[12px] text-red-500 font-semibold">AI Pipeline Failed</span>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); reprocessAI(inc.id); }}
                                              className="cr-btn cr-btn-secondary text-[11px] py-1.5 px-4 flex items-center gap-1.5"
                                            >
                                              <RotateCcw size={12} /> Retry AI Analysis
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[13px]">
                                              <span className="text-[var(--cr-text-muted)]">Generated Category</span>
                                              <span className="font-bold text-[var(--cr-text)] bg-white px-2 py-0.5 rounded border border-[var(--cr-border)] shadow-sm truncate max-w-[120px] text-right">{inc.ai_category || 'N/A'}</span>
                                            </div>
                                            <div>
                                              <div className="flex justify-between items-center text-[13px]">
                                                <span className="text-[var(--cr-text-muted)]">Suggested Severity</span>
                                                <span className="font-bold text-[var(--cr-text)] bg-white px-2 py-0.5 rounded border border-[var(--cr-border)] shadow-sm text-right">{inc.ai_severity || 'N/A'}</span>
                                              </div>
                                              {inc.ai_structured_data?.severity_explanation && (
                                                <div className="bg-white p-2 text-[11px] rounded border border-[var(--cr-border)] mt-2 italic text-[var(--cr-text-muted)] border-l-2 border-l-[var(--cr-primary)]">
                                                  "{inc.ai_structured_data.severity_explanation}"
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex justify-between items-center text-[13px]">
                                              <span className="text-[var(--cr-text-muted)]">Target Department</span>
                                              <span className="font-bold text-[var(--cr-primary)]">{inc.ai_department || 'General'}</span>
                                            </div>
                                            
                                            <hr className="border-[var(--cr-border)] my-2"/>
                                            
                                            <div className="flex flex-col gap-2 pt-2">
                                               {(inc.ai_category || inc.ai_severity) && (
                                                 <button onClick={(e) => { e.stopPropagation(); acceptAiTriage(inc); }} className="w-full cr-btn cr-btn-primary py-2 text-[12px] flex items-center justify-center gap-1.5"><CheckCircle2 size={14}/> Accept AI Triage</button>
                                               )}
                                               {isAiFailed(inc) && (
                                                 <button onClick={(e) => { e.stopPropagation(); reprocessAI(inc.id); }} className="w-full cr-btn cr-btn-secondary py-2 text-[12px] flex items-center justify-center gap-1.5"><RotateCcw size={14}/> Re-run AI</button>
                                               )}
                                               {!inc.ai_processing_status && (
                                                 <button onClick={(e) => { e.stopPropagation(); reprocessAI(inc.id); }} className="w-full cr-btn cr-btn-primary py-2 text-[12px] flex items-center justify-center gap-1.5"><Zap size={14}/> Run AI Analysis</button>
                                               )}
                                               <select 
                                                 className="w-full cr-input py-2 text-[12px] px-2 h-auto cursor-pointer border-[var(--cr-border)]"
                                                 value={inc.assigned_to || ''}
                                                 onChange={(e) => { 
                                                   e.stopPropagation(); 
                                                   if(e.target.value) setConfirmAssign({ incidentId: inc.id, workerId: e.target.value });
                                                 }}
                                                 onClick={(e) => e.stopPropagation()}
                                               >
                                                 <option value="" disabled>Dispatch Unit...</option>
                                                 {inc.ai_department && workers.filter(w => w.department === inc.ai_department).length > 0 && (
                                                   <optgroup label={`✨ Smart Dispatch: ${inc.ai_department}`}>
                                                     {workers.filter(w => w.department === inc.ai_department).map(w => (
                                                        <option key={w.id} value={w.id}>★ {w.full_name}</option>
                                                     ))}
                                                   </optgroup>
                                                 )}
                                                 <optgroup label="All Units">
                                                   {workers.filter(w => w.department !== inc.ai_department).map(w => <option key={w.id} value={w.id}>{w.full_name} {w.department ? `(${w.department})` : ''}</option>)}
                                                 </optgroup>
                                               </select>
                                            </div>
                                          </div>
                                        )}
                                     </div>
                                   </div>

                                   {/* Phase 3: Cluster Intelligence */}
                                   {(inc.duplicate_count != null && inc.duplicate_count > 0) && (
                                      <div className="cr-cluster-card">
                                        <h4 className="cr-cluster-header">
                                          <Layers size={14}/> Cluster Intelligence
                                        </h4>
                                        <div className="cr-cluster-grid">
                                          <div className="cr-cluster-stat">
                                            <div className="cr-cluster-stat-value">{inc.duplicate_count}</div>
                                            <div className="cr-cluster-stat-label">Related Reports</div>
                                          </div>
                                          <div className="cr-cluster-stat">
                                            <div className="cr-cluster-stat-value">
                                              {inc.is_primary_incident
                                                ? <ShieldCheck size={22} className="text-[#0055A4]" />
                                                : <Link2 size={22} className="text-[#0055A4]" />}
                                            </div>
                                            <div className="cr-cluster-stat-label">{inc.is_primary_incident ? 'Primary' : 'Linked'}</div>
                                          </div>
                                          <div className="cr-cluster-stat">
                                            <div className="cr-cluster-stat-value">
                                              <span className={
                                                inc.duplicate_count >= 10 ? 'cr-cluster-pulse cr-cluster-pulse--high'
                                                : inc.duplicate_count >= 5  ? 'cr-cluster-pulse cr-cluster-pulse--med'
                                                : 'cr-cluster-pulse cr-cluster-pulse--low'
                                              } />
                                            </div>
                                            <div className="cr-cluster-stat-label">Crowd Surge</div>
                                          </div>
                                        </div>
                                        <div className="cr-cluster-footer">
                                          <span><span className="font-semibold">Hash:</span> <span className="cr-mono">{inc.cluster_id?.substring(0, 12)}</span></span>
                                          <span className="flex items-center gap-1"><Zap size={10} /> Auto-escalating</span>
                                        </div>
                                      </div>
                                    )}

                                   {/* Resolution Timeline */}
                                   <div className="pt-4 border-t border-[var(--cr-border)]">
                                     <h3 className="font-bold text-[14px] flex items-center gap-2 text-[var(--cr-text)] mb-4">
                                       <Clock size={16} className="text-[var(--cr-text-muted)]" /> Resolution Timeline & Proofs
                                     </h3>
                                     
                                     {(!incidentUpdates[inc.id] || incidentUpdates[inc.id].length === 0) ? (
                                        <div className="text-[12px] text-[var(--cr-text-muted)] bg-[var(--cr-bg)] py-6 px-4 rounded-lg text-center border border-dashed border-[var(--cr-border)]">
                                          No updates have been dispatched yet. Assign a worker to initiate a timeline.
                                        </div>
                                     ) : (
                                       <div className="space-y-4">
                                         {incidentUpdates[inc.id].map((update, idx) => (
                                           <div key={update.id} className="flex gap-4">
                                              <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 rounded-full bg-[var(--cr-primary)] mt-1.5 border-2 border-[var(--cr-surface)] ring-1 ring-[var(--cr-primary)]"></div>
                                                {idx !== incidentUpdates[inc.id].length - 1 && <div className="w-px h-full bg-[var(--cr-border)] mt-1"></div>}
                                              </div>
                                              <div className="flex-1 bg-[var(--cr-bg)] border border-[var(--cr-border)] rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                   <div>
                                                      <span className="font-bold text-[13px] text-[var(--cr-text)] mr-2">Dispatched Worker Update</span>
                                                      <span className="text-[11px] bg-[var(--cr-bg-offset)] px-2 py-0.5 rounded text-[var(--cr-text-muted)] uppercase">{update.status}</span>
                                                   </div>
                                                   <span className="text-[11px] text-[var(--cr-text-muted)]">{new Date(update.created_at).toLocaleString()}</span>
                                                </div>
                                                {update.note && (
                                                  <p className="text-[12px] text-[var(--cr-text)] mt-2">"{update.note}"</p>
                                                )}
                                                {update.after_image_url && (
                                                  <div className="mt-3">
                                                    <span className="text-[11px] font-bold text-[var(--cr-text-muted)] uppercase tracking-wide block mb-1">Worker Verified Proof:</span>
                                                    <a href={update.after_image_url} target="_blank" rel="noreferrer">
                                                      <img src={update.after_image_url} className="w-full max-w-[200px] h-auto rounded border border-[var(--cr-border)] hover:opacity-90" alt="Resolution Proof" />
                                                    </a>
                                                  </div>
                                                )}
                                              </div>
                                           </div>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                </div>
                              </td>
                           </motion.tr>
                         )}
                       </AnimatePresence>
                    </React.Fragment>
                 ))}
                 {incidents.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-[var(--cr-text-muted)]">No active incidents require triage.</td></tr>}
                 {filteredIncidents.length === 0 && incidents.length > 0 && (
                   <tr><td colSpan={9} className="text-center py-12">
                     <AlertTriangle size={24} className="mx-auto mb-2 text-[var(--cr-text-muted)]" />
                     <p className="text-[13px] text-[var(--cr-text-muted)] mb-3">No incidents match your current filters.</p>
                     <button onClick={resetFilters} className="text-[12px] px-4 py-1.5 rounded-md border border-[var(--cr-border)] text-[var(--cr-primary)] hover:bg-[var(--cr-blue-light)] transition-colors">Reset All Filters</button>
                   </td></tr>
                 )}
               </tbody>
             </table>
          </div>
        )}
      </motion.div>

      {/* ── Bulk Action Floating Bar ─────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--cr-surface)] border border-[var(--cr-border)] shadow-2xl rounded-xl px-5 py-3 flex items-center gap-4"
          >
            <span className="text-[13px] font-bold text-[var(--cr-text)]">{selectedIds.size} selected</span>
            <div className="w-px h-6 bg-[var(--cr-border)]" />
            <button
              onClick={batchAcceptTriage}
              className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--cr-primary)] text-white hover:opacity-90 transition-opacity font-medium"
            >
              <CheckCircle2 size={14} /> Accept AI Triage
            </button>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) batchAssignWorker(e.target.value); e.target.value = ''; }}
              onClick={(e) => e.stopPropagation()}
              className="text-[12px] bg-[var(--cr-bg)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
            >
              <option value="" disabled>Assign to Worker...</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[12px] flex items-center gap-1 px-2 py-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={14} /> Deselect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAssign} onOpenChange={(open) => !open && setConfirmAssign(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px]"><UserCheck size={18} className="text-[var(--cr-primary)]"/> Confirm Dispatch</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 text-[13px] text-[var(--cr-text)]">
            <p>You are about to officially transfer and assign this incident to:</p>
            <div className="bg-[var(--cr-bg)] border border-[var(--cr-border)] p-3 rounded flex items-center justify-between shadow-sm">
               <span className="font-bold flex items-center gap-2"><UserCheck size={14} className="text-[var(--cr-text-muted)]"/> {confirmAssign && workerName(confirmAssign.workerId)}</span>
               {confirmAssign && workers.find(w => w.id === confirmAssign.workerId)?.department && (
                 <span className="text-[11px] bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] px-2 py-0.5 rounded font-medium border border-[var(--cr-primary)]/20">
                   {workers.find(w => w.id === confirmAssign.workerId)?.department}
                 </span>
               )}
            </div>
            <p className="text-[12px] text-[var(--cr-text-muted)] mt-2 bg-amber-50 text-amber-700 p-2 rounded border border-amber-200">
              <AlertTriangle size={12} className="inline mr-1" />
              The assigned worker will be notified and this incident will be pushed to their active dashboard for immediate attention.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4 border-t border-[var(--cr-border)] pt-4">
            <button
              onClick={() => setConfirmAssign(null)}
              className="px-4 py-2 text-[12px] rounded border border-[var(--cr-border)] bg-[var(--cr-surface)] hover:bg-[var(--cr-bg)] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmAssign) {
                  assignWorker(confirmAssign.incidentId, confirmAssign.workerId);
                  setConfirmAssign(null);
                  toast.success("Incident officially transferred and dispatched");
                }
              }}
              className="px-4 py-2 text-[12px] rounded bg-[var(--cr-primary)] text-white hover:bg-[var(--cr-primary-hover)] font-medium transition-colors shadow-sm"
            >
              Confirm Dispatch
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
