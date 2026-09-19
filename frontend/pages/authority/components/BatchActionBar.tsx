import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

export interface BatchActionBarProps {
  selectedCount: number;
  workers: { id: string, full_name: string }[];
  onBatchAcceptTriage: () => void;
  onBatchAssignWorker: (workerId: string) => void;
  onDeselectAll: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  workers,
  onBatchAcceptTriage,
  onBatchAssignWorker,
  onDeselectAll
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl bg-[var(--cr-surface)] border border-[var(--cr-border)] shadow-2xl rounded-xl p-3 sm:px-5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] sm:text-[13px] font-bold text-[var(--cr-text)] whitespace-nowrap">
              {selectedCount} selected
            </span>
            <button
              onClick={onDeselectAll}
              className="text-[11px] sm:text-[12px] flex items-center gap-1 px-1.5 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <X size={13} /> Clear
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
            <button
              onClick={onBatchAcceptTriage}
              className="text-[11.5px] sm:text-[12px] flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--cr-primary)] text-white hover:opacity-90 transition-opacity font-medium cursor-pointer"
            >
              <CheckCircle2 size={13} /> Accept Triage
            </button>
            <select
              defaultValue=""
              onChange={(e) => { 
                 if (e.target.value) {
                   onBatchAssignWorker(e.target.value); 
                   e.target.value = ''; 
                 }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[11.5px] sm:text-[12px] bg-[var(--cr-bg)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
            >
              <option value="" disabled>Assign to Worker...</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
            </select>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
