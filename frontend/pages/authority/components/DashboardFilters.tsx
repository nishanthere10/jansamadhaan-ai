import React from 'react';
import {
  Search,
  RefreshCw,
  Sparkles,
  LayoutList,
  Columns,
  MapPin,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { FilterChips, type FilterChip } from '../../../components/shared/FilterChips';

export type AuthorityViewMode = 'table' | 'split' | 'map';

export interface DashboardFiltersProps {
  loading: boolean;
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterRisk: string;
  setFilterRisk: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterDept: string;
  setFilterDept: (val: string) => void;
  uniqueDepartments: string[];
  filtersActive: boolean;
  onReset: () => void;
  onRefresh: () => void;
  
  // New Triage Capabilities
  viewMode?: AuthorityViewMode;
  setViewMode?: (mode: AuthorityViewMode) => void;
  filterSla?: string;
  setFilterSla?: (val: string) => void;
  onExportCsv?: () => void;
  slaBreachedCount?: number;
  unassignedCount?: number;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  loading,
  filteredCount,
  searchQuery,
  setSearchQuery,
  filterRisk,
  setFilterRisk,
  filterStatus,
  setFilterStatus,
  filterDept,
  setFilterDept,
  uniqueDepartments,
  filtersActive,
  onReset,
  onRefresh,
  viewMode = 'table',
  setViewMode,
  filterSla = 'all',
  setFilterSla,
  onExportCsv,
  slaBreachedCount = 0,
  unassignedCount = 0,
}) => {
  // Build active filter chips
  const activeChips: FilterChip[] = [];
  if (searchQuery.trim()) {
    activeChips.push({ id: 'search', label: `Search: "${searchQuery}"` });
  }
  if (filterRisk !== 'all') {
    activeChips.push({ id: 'risk', label: `Risk: ${filterRisk}` });
  }
  if (filterStatus !== 'all') {
    activeChips.push({ id: 'status', label: `Status: ${filterStatus}` });
  }
  if (filterDept !== 'all') {
    activeChips.push({ id: 'dept', label: `Dept: ${filterDept}` });
  }
  if (filterSla !== 'all') {
    activeChips.push({ id: 'sla', label: `SLA: ${filterSla}` });
  }

  const handleRemoveChip = (id: string) => {
    if (id === 'search') setSearchQuery('');
    else if (id === 'risk') setFilterRisk('all');
    else if (id === 'status') setFilterStatus('all');
    else if (id === 'dept') setFilterDept('all');
    else if (id === 'sla' && setFilterSla) setFilterSla('all');
  };

  return (
    <div className="px-5 py-4 border-b border-[var(--cr-border)] bg-[var(--cr-surface)] space-y-3">
      {/* Header with Title, View Mode Switcher & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-bold text-[var(--cr-text)] flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--cr-primary)]" /> Command Triage Queue
          </h2>
          <span className="text-[11px] font-bold text-[var(--cr-blue-mid)] bg-[var(--cr-blue-light)] px-2.5 py-0.5 rounded-full">
            {filteredCount} Incidents
          </span>
        </div>

        {/* View Mode Toggle & CSV Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Selector Buttons */}
          {setViewMode && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Tabular List View"
              >
                <LayoutList size={13} />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Dual-Pane Fast-Track Workspace"
              >
                <Columns size={13} />
                <span>Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Territory GIS Map View"
              >
                <MapPin size={13} />
                <span>Map</span>
              </button>
            </div>
          )}

          {/* Export CSV Button */}
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="text-[12px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--cr-border)] text-[var(--cr-text)] hover:bg-[var(--cr-bg)] transition shadow-sm font-medium"
              title="Export Daily Municipal Review Sheet (CSV)"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="text-[12px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--cr-border)] text-[var(--cr-text)] hover:bg-[var(--cr-bg)] transition shadow-sm"
            title="Refresh Incidents"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SLA Quick Action Filter Tabs (CPGRAMS / Swachhata Inspired) */}
      {setFilterSla && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterSla('all')}
            className={`px-3 py-1 rounded-full border transition shrink-0 font-medium ${
              filterSla === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            All Queue
          </button>

          <button
            type="button"
            onClick={() => setFilterSla('breached')}
            className={`px-3 py-1 rounded-full border transition shrink-0 flex items-center gap-1 font-medium ${
              filterSla === 'breached'
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100'
            }`}
          >
            <AlertCircle size={12} />
            <span>SLA Breached / Overdue</span>
            {slaBreachedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-200 dark:bg-red-800 font-bold">
                {slaBreachedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterSla('unassigned')}
            className={`px-3 py-1 rounded-full border transition shrink-0 flex items-center gap-1 font-medium ${
              filterSla === 'unassigned'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <Clock size={12} />
            <span>Unassigned Dispatch</span>
            {unassignedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-800 font-bold">
                {unassignedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterSla('ai_review')}
            className={`px-3 py-1 rounded-full border transition shrink-0 flex items-center gap-1 font-medium ${
              filterSla === 'ai_review'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
            }`}
          >
            <Sparkles size={12} />
            <span>Needs AI Review</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterSla('resolved')}
            className={`px-3 py-1 rounded-full border transition shrink-0 flex items-center gap-1 font-medium ${
              filterSla === 'resolved'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Resolved</span>
          </button>
        </div>
      )}

      {/* Filter controls row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 pt-1">
        <div className="relative w-full lg:flex-1 lg:min-w-[200px] sm:col-span-2 lg:col-span-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)]" />
          <input
            type="text"
            placeholder="Search tracking ID, title, address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[12px] w-full bg-[var(--cr-bg)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-[var(--cr-primary)] placeholder:text-[var(--cr-text-muted)]"
          />
        </div>

        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="text-[12px] w-full sm:w-auto bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
          aria-label="Filter by risk severity"
        >
          <option value="all">All Severities</option>
          <option value="emergency">Critical / Emergency</option>
          <option value="high">High Severity</option>
          <option value="medium">Medium Severity</option>
          <option value="low">Low Severity</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-[12px] w-full sm:w-auto bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
          aria-label="Filter by incident status"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="text-[12px] w-full sm:w-auto bg-[var(--cr-surface)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
          aria-label="Filter by department"
        >
          <option value="all">All Departments</option>
          {uniqueDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] text-[var(--cr-blue-mid)] hover:underline px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <FilterChips chips={activeChips} onRemove={handleRemoveChip} onClearAll={onReset} />
      )}
    </div>
  );
};
