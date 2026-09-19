import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, UserX, Layers, ArrowRight, ShieldAlert } from 'lucide-react';
import type { Incident } from '../../../types';

export interface AttentionStripProps {
  incidents: Incident[];
  onFilterCritical: () => void;
  onFilterUnassigned: () => void;
  onFilterClustered: () => void;
}

export const AttentionStrip: React.FC<AttentionStripProps> = ({
  incidents,
  onFilterCritical,
  onFilterUnassigned,
  onFilterClustered,
}) => {
  const criticalCount = incidents.filter(
    (i) => (i.severity === 'critical' || i.ai_severity === 'critical') && i.status !== 'resolved'
  ).length;

  const unassignedCount = incidents.filter(
    (i) => !i.assigned_to && i.status === 'pending'
  ).length;

  const clusteredCount = incidents.filter(
    (i) => (i.duplicate_count || 0) > 0 && i.status !== 'resolved'
  ).length;

  // Don't show if nothing urgently needs attention
  if (criticalCount === 0 && unassignedCount === 0 && clusteredCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50/90 via-amber-50/60 to-white dark:from-red-950/30 dark:via-amber-950/20 dark:to-slate-900 shadow-sm"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Label */}
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block">
              Needs Immediate Attention
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              High priority operational actions requiring municipal review
            </span>
          </div>
        </div>

        {/* Action item counters */}
        <div className="flex flex-wrap items-center gap-3">
          {criticalCount > 0 && (
            <button
              type="button"
              onClick={onFilterCritical}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100/80 hover:bg-red-200/80 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 text-xs font-bold transition-colors border border-red-200 dark:border-red-800 shadow-xs"
            >
              <AlertTriangle size={14} className="text-red-600" />
              <span>{criticalCount} Critical Incidents</span>
              <ArrowRight size={12} className="opacity-60" />
            </button>
          )}

          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={onFilterUnassigned}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold transition-colors border border-amber-200 dark:border-amber-800 shadow-xs"
            >
              <UserX size={14} className="text-amber-600" />
              <span>{unassignedCount} Awaiting Dispatch</span>
              <ArrowRight size={12} className="opacity-60" />
            </button>
          )}

          {clusteredCount > 0 && (
            <button
              type="button"
              onClick={onFilterClustered}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800 shadow-xs"
            >
              <Layers size={14} className="text-blue-600" />
              <span>{clusteredCount} Clustered Issues</span>
              <ArrowRight size={12} className="opacity-60" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
