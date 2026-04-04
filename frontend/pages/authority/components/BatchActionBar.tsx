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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--cr-surface)] border border-[var(--cr-border)] shadow-2xl rounded-xl px-5 py-3 flex items-center gap-4"
        >
          <span className="text-[13px] font-bold text-[var(--cr-text)]">{selectedCount} selected</span>
          <div className="w-px h-6 bg-[var(--cr-border)]" />
          <button
            onClick={onBatchAcceptTriage}
            className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--cr-primary)] text-white hover:opacity-90 transition-opacity font-medium"
          >
            <CheckCircle2 size={14} /> Accept AI Triage
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
            className="text-[12px] bg-[var(--cr-bg)] border border-[var(--cr-border)] text-[var(--cr-text)] rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--cr-primary)]"
          >
            <option value="" disabled>Assign to Worker...</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
          <button
            onClick={onDeselectAll}
            className="text-[12px] flex items-center gap-1 px-2 py-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={14} /> Deselect
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
