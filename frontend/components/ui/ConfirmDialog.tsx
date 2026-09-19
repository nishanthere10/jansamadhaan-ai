import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Explanation copy — should say what will happen, not just "are you sure?" */
  description?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Whether the action is destructive — turns confirm button red */
  destructive?: boolean;
  /** Whether the confirm action is loading (shows spinner) */
  isLoading?: boolean;
}

/**
 * ConfirmDialog — reusable confirmation modal for destructive or
 * irreversible actions (reject incident, delete, reassign, etc.).
 *
 * Rules:
 * - Never use generic "Are you sure?" alone
 * - Always say what will happen as a consequence
 * - Destructive actions use `destructive=true` (red confirm button)
 * - Non-destructive confirmations (e.g. assign) use default authority blue
 *
 * @example
 * <ConfirmDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleReject}
 *   title="Reject this report?"
 *   description="This report will be marked as rejected and the citizen will be notified. This action cannot be undone."
 *   confirmLabel="Reject Report"
 *   destructive
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          {destructive && (
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--cr-red-light)] mb-3 mx-auto">
              <AlertTriangle size={20} className="text-[var(--cr-red)]" aria-hidden />
            </div>
          )}
          <DialogTitle className="text-center text-[15px]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center text-[13px] leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'authority'}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
            aria-busy={isLoading}
          >
            {isLoading ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
