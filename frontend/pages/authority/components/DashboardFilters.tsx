import React from 'react';
import { Search, X, RefreshCw, Sparkles } from 'lucide-react';

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
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  loading, filteredCount,
  searchQuery, setSearchQuery,
  filterRisk, setFilterRisk,
  filterStatus, setFilterStatus,
  filterDept, setFilterDept,
  uniqueDepartments, filtersActive,
  onReset, onRefresh
}) => {
  return (
    <div className="px-5 py-4 border-b border-[var(--cr-border)] bg-[var(--cr-surface)] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--cr-text)] flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--cr-primary)]"/> Smart Triage Queue
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh} 
            className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--cr-border)] text-[var(--cr-text)] hover:bg-[var(--cr-bg)] transition-colors" 
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <span className="text-[12px] font-bold text-[var(--cr-blue-mid)] bg-[var(--cr-blue-light)] px-2 py-0.5 rounded-full">
            {filteredCount} Tickets
          </span>
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
           <button onClick={onReset} className="text-[11px] flex items-center gap-1 px-2 py-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors border border-red-200">
             <X size={12} /> Reset
           </button>
         )}
      </div>
    </div>
  );
};
