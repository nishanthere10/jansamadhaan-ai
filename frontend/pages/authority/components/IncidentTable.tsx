import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';

export interface IncidentTableProps {
  loading: boolean;
  totalIncidents: number;
  filteredCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onResetFilters: () => void;
  children: React.ReactNode;
}

export const IncidentTable: React.FC<IncidentTableProps> = ({
  loading,
  totalIncidents,
  filteredCount,
  isAllSelected,
  onToggleSelectAll,
  onResetFilters,
  children
}) => {
  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="cr-table w-full text-left border-collapse">
        <thead>
          <tr className="bg-[var(--cr-bg)] text-[11px] uppercase tracking-wider text-[var(--cr-text-muted)]">
             <th className="font-semibold p-4 w-10">
               <input 
                 type="checkbox" 
                 checked={isAllSelected} 
                 onChange={onToggleSelectAll} 
                 className="rounded border-[var(--cr-border)] accent-[var(--cr-primary)] cursor-pointer" 
                 title="Select all viewable incidents" 
               />
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
          {children}
          
          {totalIncidents === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-12 text-[var(--cr-text-muted)]">
                No active incidents require triage.
              </td>
            </tr>
          )}
          
          {filteredCount === 0 && totalIncidents > 0 && (
            <tr>
              <td colSpan={9} className="text-center py-12">
                <AlertTriangle size={24} className="mx-auto mb-2 text-[var(--cr-text-muted)]" />
                <p className="text-[13px] text-[var(--cr-text-muted)] mb-3">No incidents match your current filters.</p>
                <button 
                  onClick={onResetFilters} 
                  className="text-[12px] px-4 py-1.5 rounded-md border border-[var(--cr-border)] text-[var(--cr-primary)] hover:bg-[var(--cr-blue-light)] transition-colors"
                >
                  Reset All Filters
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
