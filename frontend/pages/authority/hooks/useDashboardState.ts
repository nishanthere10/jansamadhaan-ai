import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../../lib/api';
import { toast } from 'sonner';
import type { Incident, IncidentUpdate } from '../../../types';
import { calculateSlaStatus } from '../../../lib/sla';
import type { AuthorityViewMode } from '../components/DashboardFilters';

export function useDashboardState() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<Record<string, IncidentUpdate[]>>({});
  const [workers, setWorkers] = useState<{ id: string; full_name: string; department?: string; phone_number?: string }[]>([]);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(new Set());
  
  // View & Filter modes
  const [viewMode, setViewModeState] = useState<AuthorityViewMode>(() => {
    return (localStorage.getItem('cr_authority_view_mode') as AuthorityViewMode) || 'table';
  });
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSla, setFilterSla] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAssign, setConfirmAssign] = useState<{ incidentId: string; workerId: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setViewMode = (mode: AuthorityViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('cr_authority_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // ── Worker Workload Map ─────────────────────────────────────
  const workerWorkloads = useMemo(() => {
    const loads: Record<string, number> = {};
    incidents.forEach(inc => {
      if (inc.assigned_to && inc.status !== 'resolved' && inc.status !== 'rejected') {
        loads[inc.assigned_to] = (loads[inc.assigned_to] || 0) + 1;
      }
    });
    return loads;
  }, [incidents]);

  // ── Data Loading ─────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/v1/incidents');
      const json = await res.json();
      if (json.success) {
        setIncidents(json.data);
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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasProcessing = incidents.some(
      i => i.ai_processing_status === 'processing' || i.ai_processing_status === 'pending'
    ) || reprocessingIds.size > 0;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };

    if (hasProcessing) {
      pollingRef.current = setInterval(tick, 8000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && hasProcessing) {
        load();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [incidents, reprocessingIds, load]);

  // ── Actions ─────────────────────────────────────────────
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

  const updateIncidentStatus = async (incidentId: string, status: string, note?: string) => {
    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, note }),
      });
      const json = await res.json();
      if (json.success) {
        setIncidents((prev) =>
          prev.map((inc) => (inc.id === incidentId ? { ...inc, status: status as any } : inc))
        );
        toast.success(`Incident marked as ${status.toUpperCase()}`);
      } else {
        toast.error(json.message || 'Status update failed');
      }
    } catch {
      toast.error('Network error during status update');
    }
  };

  const acceptAiTriage = async (incident: Incident) => {
    const payload: Record<string, string> = {};
    if (incident.ai_category) payload.category = incident.ai_category;
    if (incident.ai_severity) {
      const cleanSev = incident.ai_severity.toLowerCase().replace(' risk', '').trim();
      payload.severity = (cleanSev === 'emergency' || cleanSev === 'critical') ? 'critical' : cleanSev;
    }
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

  // 1-Click Fast-Track AI Dispatch
  const fastTrackDispatch = async (incident: Incident, overrideWorkerId?: string) => {
    try {
      // 1. Determine Worker
      let targetWorker = workers.find(w => w.id === overrideWorkerId);
      if (!targetWorker) {
        const targetDept = (incident.ai_department || incident.category || '').toLowerCase();
        const deptWorkers = workers.filter(w => 
          (w.department || '').toLowerCase().includes(targetDept) || targetDept.includes((w.department || '').toLowerCase())
        );
        const pool = deptWorkers.length ? deptWorkers : workers;
        targetWorker = [...pool].sort((a, b) => (workerWorkloads[a.id] || 0) - (workerWorkloads[b.id] || 0))[0];
      }

      if (!targetWorker) {
        toast.error('No field workers available to dispatch.');
        return;
      }

      // 2. Accept AI Triage
      await acceptAiTriage(incident);

      // 3. Assign Worker
      await assignWorker(incident.id, targetWorker.id);

      toast.success(`⚡ Dispatched #${incident.tracking_id || incident.id.slice(0, 8)} to ${targetWorker.full_name}!`);
      load();
    } catch (err) {
      console.error('Fast-track dispatch failed:', err);
      toast.error('Fast-track dispatch failed');
    }
  };

  const reprocessAI = async (incidentId: string) => {
    setReprocessingIds(prev => new Set(prev).add(incidentId));
    setIncidents(prev => prev.map(i =>
      i.id === incidentId ? { ...i, ai_processing_status: 'processing' } : i
    ));
    try {
      const res = await fetchWithAuth(`/api/v1/incidents/${incidentId}/reprocess`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) {
        setReprocessingIds(prev => { const n = new Set(prev); n.delete(incidentId); return n; });
      }
    } catch {
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

  const toggleSelectAll = (isAllSelected: boolean) => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map(i => i.id)));
    }
  };

  const batchAcceptTriage = async () => {
    const targets = incidents.filter(i => selectedIds.has(i.id) && (i.ai_category || i.ai_severity));
    let ok = 0;
    for (const inc of targets) {
      try { await acceptAiTriage(inc); ok++; } catch { }
    }
    toast.success(`Accepted AI triage for ${ok} incident(s)`);
    setSelectedIds(new Set());
    load();
  };

  const batchAssignWorker = async (workerId: string) => {
    let ok = 0;
    for (const id of selectedIds) {
      try { await assignWorker(id, workerId); ok++; } catch { }
    }
    toast.success(`Assigned ${ok} incident(s)`);
    setSelectedIds(new Set());
    load();
  };

  const resetFilters = () => {
    setFilterRisk('all');
    setFilterDept('all');
    setFilterStatus('all');
    setFilterSla('all');
    setSearchQuery('');
  };

  // ── CSV Export for Municipal Review Meetings ──────────────
  const exportIncidentsCsv = () => {
    if (!filteredIncidents.length) {
      toast.error('No incidents to export');
      return;
    }

    const headers = [
      'Tracking ID',
      'Title',
      'Category',
      'Severity',
      'Status',
      'SLA Status',
      'Hours Remaining',
      'Assigned Worker',
      'Department',
      'Address',
      'Reported Date',
    ];

    const rows = filteredIncidents.map(i => {
      const sla = calculateSlaStatus(i.created_at, i.category, i.severity, i.status);
      const worker = workers.find(w => w.id === i.assigned_to)?.full_name || 'Unassigned';
      const formattedDate = i.created_at && !isNaN(new Date(i.created_at).getTime()) 
        ? new Date(i.created_at).toISOString() 
        : 'N/A';

      return [
        `"${i.tracking_id || i.id}"`,
        `"${(i.title || i.generated_title || '').replace(/"/g, '""')}"`,
        `"${i.category || ''}"`,
        `"${i.severity || ''}"`,
        `"${i.status || ''}"`,
        `"${sla.label}"`,
        `"${sla.hoursRemaining}"`,
        `"${worker}"`,
        `"${i.ai_department || ''}"`,
        `"${(i.address || '').replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jan_samadhan_review_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredIncidents.length} incidents to CSV`);
  };

  const filtersActive = filterRisk !== 'all' || filterDept !== 'all' || filterStatus !== 'all' || filterSla !== 'all' || searchQuery !== '';

  // ── Helpers ──────────────────────────────────────────────
  const isAiPending = useCallback((inc: Incident) =>
    inc.ai_processing_status === 'processing' || inc.ai_processing_status === 'pending' || reprocessingIds.has(inc.id), [reprocessingIds]
  );
  
  const isAiFailed = useCallback((inc: Incident) =>
    inc.ai_processing_status === 'failed' && !reprocessingIds.has(inc.id), [reprocessingIds]
  );
  
  const isAiDone = useCallback((inc: Incident) =>
    inc.ai_processing_status === 'completed' && !reprocessingIds.has(inc.id), [reprocessingIds]
  );

  const timeAgo = (iso?: string | null) => {
    if (!iso) return 'Just now';
    const parsed = new Date(iso).getTime();
    if (isNaN(parsed)) return 'Just now';
    const min = Math.floor((Date.now() - parsed) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const timeAgoColor = (inc: Incident) => {
    if (inc.status === 'resolved' || inc.status === 'rejected') return 'var(--cr-text-muted)';
    const parsed = new Date(inc.created_at).getTime();
    if (isNaN(parsed)) return 'var(--cr-text-muted)';
    const hrs = (Date.now() - parsed) / 3600000;
    if (hrs > 24) return 'var(--cr-red)';
    if (hrs > 6) return 'var(--cr-amber)';
    return 'var(--cr-text-muted)';
  };

  const workerName = (id: string | null | undefined) => {
    return id ? workers.find(w => w.id === id)?.full_name || null : null;
  };

  // Sort and filter setup
  const filteredIncidents = incidents
    .filter(inc => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${inc.tracking_id} ${inc.title} ${inc.description} ${inc.address || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // SLA Quick filter
      if (filterSla !== 'all') {
        const sla = calculateSlaStatus(inc.created_at, inc.category, inc.severity, inc.status);
        if (filterSla === 'breached' && (!sla.isBreached && !sla.isExpiringSoon)) return false;
        if (filterSla === 'breached' && (inc.status === 'resolved' || inc.status === 'rejected')) return false;
        if (filterSla === 'unassigned' && (inc.assigned_to || inc.status === 'resolved' || inc.status === 'rejected')) return false;
        if (filterSla === 'ai_review' && (inc.ai_processing_status !== 'completed' || inc.status === 'resolved' || inc.status === 'rejected')) return false;
        if (filterSla === 'resolved' && inc.status !== 'resolved') return false;
      }

      if (filterRisk !== 'all') {
        const incRisk = (inc.ai_severity || inc.severity || '').toLowerCase();
        if (filterRisk === 'emergency' && !incRisk.includes('emergency') && !incRisk.includes('critical')) return false;
        if (filterRisk === 'high' && !incRisk.includes('high')) return false;
        if (filterRisk === 'medium' && !incRisk.includes('medium')) return false;
        if (filterRisk === 'low' && !incRisk.includes('low')) return false;
      }
      if (filterStatus !== 'all') {
        const normInc = (inc.status || '').replace('_', '-');
        const normFilter = filterStatus.replace('_', '-');
        if (normInc !== normFilter) return false;
      }
      if (filterDept !== 'all') {
        const dept = (inc.ai_department || 'unassigned').toLowerCase().trim();
        const target = filterDept.toLowerCase().trim();
        if (target === 'unassigned' && inc.ai_department) return false;
        if (target !== 'unassigned' && dept !== target) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Prioritize breached and critical SLAs
      const slaA = calculateSlaStatus(a.created_at, a.category, a.severity, a.status);
      const slaB = calculateSlaStatus(b.created_at, b.category, b.severity, b.status);
      if (slaA.isBreached && !slaB.isBreached) return -1;
      if (!slaA.isBreached && slaB.isBreached) return 1;
      if (slaA.isExpiringSoon && !slaB.isExpiringSoon) return -1;
      if (!slaA.isExpiringSoon && slaB.isExpiringSoon) return 1;

      if (!isAiDone(a) && isAiDone(b)) return -1;
      if (isAiDone(a) && !isAiDone(b)) return 1;
      const dupA = a.duplicate_count || 0;
      const dupB = b.duplicate_count || 0;
      if (dupA !== dupB) return dupB - dupA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const uniqueDepartments = Array.from(new Set(incidents.map(i => i.ai_department).filter(Boolean))) as string[];

  // Counts for Attention Strip & Filters
  const slaBreachedCount = useMemo(() => {
    return incidents.filter(i => {
      if (i.status === 'resolved' || i.status === 'rejected') return false;
      const sla = calculateSlaStatus(i.created_at, i.category, i.severity, i.status);
      return sla.isBreached || sla.isExpiringSoon;
    }).length;
  }, [incidents]);

  const unassignedCount = useMemo(() => {
    return incidents.filter(i => !i.assigned_to && i.status !== 'resolved' && i.status !== 'rejected').length;
  }, [incidents]);

  const counts = {
    total: filtersActive ? `${filteredIncidents.length} of ${incidents.length}` : `${incidents.length}`,
    pending: filteredIncidents.filter((i) => i.status === 'pending').length,
    inProgress: filteredIncidents.filter((i) => i.status === 'in-progress' || (i.status as string) === 'in_progress').length,
    critical: filteredIncidents.filter((i) => {
      const s = (i.severity || '').toLowerCase();
      const ais = (i.ai_severity || '').toLowerCase();
      return s === 'critical' || s === 'emergency' || ais.includes('critical') || ais.includes('emergency');
    }).length,
    clustered: filteredIncidents.filter((i) => (i.duplicate_count || 0) > 0).length,
  };

  return {
    state: {
      incidents, filteredIncidents, loading, expandedId, incidentUpdates,
      workers, reprocessingIds, filterRisk, filterDept, filterStatus,
      filterSla, viewMode, searchQuery, selectedIds, confirmAssign,
      filtersActive, uniqueDepartments, counts, workerWorkloads,
      slaBreachedCount, unassignedCount,
    },
    actions: {
      setFilterRisk, setFilterDept, setFilterStatus, setFilterSla,
      setViewMode, setSearchQuery, setExpandedId,
      setConfirmAssign, setSelectedIds,
      load, handleExpand, assignWorker, updateIncidentStatus, acceptAiTriage, fastTrackDispatch,
      reprocessAI, toggleSelect, toggleSelectAll, batchAcceptTriage, batchAssignWorker,
      resetFilters, exportIncidentsCsv,
    },
    helpers: {
      timeAgo, timeAgoColor, workerName, isAiPending, isAiFailed, isAiDone
    }
  };
}
