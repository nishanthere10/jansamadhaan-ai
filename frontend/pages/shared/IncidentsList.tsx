import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { Search, Filter, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { IncidentDetailModal } from '../../components/shared/IncidentDetailModal';

interface Incident {
  id: string;
  tracking_id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  category: string;
  address?: string;
  created_at: string;
  ai_processing_status?: string;
}

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  assigned: 'var(--cr-blue-mid)',
  'in-progress': 'var(--cr-orange)',
  in_progress: 'var(--cr-orange)',
  resolved: 'var(--cr-green)',
  closed: '#6b7280',
};

const severityColors: Record<string, string> = {
  critical: 'var(--cr-red)',
  high: '#f59e0b',
  medium: 'var(--cr-orange)',
  low: 'var(--cr-green)',
};

export default function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/v1/incidents')
      .then(r => r.json())
      .then(d => {
        if (d.data) setIncidents(d.data);
        else setError(d.detail || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = incidents.filter(i => {
    const matchSearch =
      !search ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.tracking_id?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    const normInc = (i.status || '').replace('_', '-');
    const normFilter = statusFilter.replace('_', '-');
    const matchStatus = statusFilter === 'all' || normInc === normFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="cr-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cr-page-title">All Incidents</h1>
        <p className="cr-page-subtitle">Browse and track all reported civic incidents</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)]" />
          <input
            type="text"
            placeholder="Search by title, ID, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cr-input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--cr-text-muted)]" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="cr-input text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="cr-alert cr-alert-error">{error}</div>
      )}

      {/* Incident Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="mx-auto mb-3 text-[var(--cr-text-muted)]" />
          <p className="text-sm text-[var(--cr-text-muted)]">No incidents found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident, i) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedIncident(incident)}
              className="cr-card p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[var(--cr-primary)]/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--cr-text-muted)]">
                      {incident.tracking_id}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${statusColors[incident.status] || '#888'}15`,
                        color: statusColors[incident.status] || '#888',
                      }}
                    >
                      {incident.status?.replace(/[-_]/g, ' ')}
                    </span>
                    {incident.ai_processing_status === 'completed' && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
                        AI ✓
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text)' }}>
                    {incident.title || 'Untitled Incident'}
                  </h3>
                  <p className="text-xs text-[var(--cr-text-muted)] line-clamp-1 mt-0.5">
                    {incident.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {incident.address && (
                      <span className="flex items-center gap-1 text-[11px] text-[var(--cr-text-muted)]">
                        <MapPin size={11} /> {incident.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-[var(--cr-text-muted)]">
                      <Clock size={11} /> {new Date(incident.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--cr-text-muted)' }}>
                    {incident.category || '—'}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${severityColors[incident.severity] || '#888'}15`,
                      color: severityColors[incident.severity] || '#888',
                    }}
                  >
                    {incident.severity || 'low'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incidentId={selectedIncident?.id || null}
        title={selectedIncident?.title}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
}
