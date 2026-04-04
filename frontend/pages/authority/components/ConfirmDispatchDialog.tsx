import React from 'react';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

export interface ConfirmDispatchDialogProps {
  confirmAssign: { incidentId: string, workerId: string } | null;
  workers: { id: string, full_name: string, department?: string }[];
  workerName: (id: string | null) => string | null;
  onClose: () => void;
  onConfirm: (incidentId: string, workerId: string) => void;
}

export const ConfirmDispatchDialog: React.FC<ConfirmDispatchDialogProps> = ({
  confirmAssign,
  workers,
  workerName,
  onClose,
  onConfirm
}) => {
  const selectedWorker = confirmAssign 
    ? workers.find(w => w.id === confirmAssign.workerId) 
    : null;

  return (
    <Dialog open={!!confirmAssign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <UserCheck size={18} className="text-[var(--cr-primary)]"/> Confirm Dispatch
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4 text-[13px] text-[var(--cr-text)]">
          <p>You are about to officially transfer and assign this incident to:</p>
          <div className="bg-[var(--cr-bg)] border border-[var(--cr-border)] p-3 rounded flex items-center justify-between shadow-sm">
             <span className="font-bold flex items-center gap-2">
               <UserCheck size={14} className="text-[var(--cr-text-muted)]"/> 
               {confirmAssign ? workerName(confirmAssign.workerId) : ''}
             </span>
             {selectedWorker?.department && (
               <span className="text-[11px] bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] px-2 py-0.5 rounded font-medium border border-[var(--cr-primary)]/20">
                 {selectedWorker.department}
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
            onClick={onClose}
            className="px-4 py-2 text-[12px] rounded border border-[var(--cr-border)] bg-[var(--cr-surface)] hover:bg-[var(--cr-bg)] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirmAssign) {
                onConfirm(confirmAssign.incidentId, confirmAssign.workerId);
                onClose();
              }
            }}
            className="px-4 py-2 text-[12px] rounded bg-[var(--cr-primary)] text-white hover:bg-[var(--cr-primary-hover)] font-medium transition-colors shadow-sm"
          >
            Confirm Dispatch
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
