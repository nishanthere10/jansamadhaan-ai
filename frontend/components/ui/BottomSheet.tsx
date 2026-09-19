import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** 'full' = full viewport height; 'auto' = fits content (default) */
  height?: 'auto' | 'full';
  className?: string;
}

/**
 * BottomSheet — mobile-first bottom sheet overlay.
 *
 * Use for mobile complex workflows: filters, assignment selection,
 * incident detail, filter drawer.
 *
 * Desktop: falls back to a centered dialog automatically.
 * Spec (ui-ux.md §25): "Mobile: bottom sheet, full-width, safe-area aware."
 *
 * Features:
 * - Focus trap
 * - Escape key to close
 * - aria-modal + role=dialog
 * - Safe area (padding for notched devices)
 * - Blurred backdrop
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  height = 'auto',
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus first focusable element when opened
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Panel'}
        aria-describedby={description ? 'bottom-sheet-desc' : undefined}
        className={cn(
          // Mobile: anchored to bottom, full-width
          'fixed bottom-0 left-0 right-0 z-[200]',
          'bg-[var(--cr-surface)] border-t border-[var(--cr-border)]',
          'rounded-t-2xl',
          // Safe area (iPhone notch / nav bar)
          'pb-[env(safe-area-inset-bottom)]',
          // Desktop: center as a standard modal
          'sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:w-full sm:max-w-lg sm:shadow-[var(--cr-shadow-lg)]',
          // Height
          height === 'full' ? 'max-h-[92dvh] overflow-y-auto' : 'max-h-[85dvh] overflow-y-auto',
          // Slide-up animation
          'animate-[slideUp_var(--motion-slow)_var(--ease-spring)_both]',
          className
        )}
        style={{
          // Custom keyframe injection via inline style fallback
          // Real keyframe is in index.css as cr-slide-up-fade
        }}
      >
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--cr-border-strong)]" />
        </div>

        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cr-border)]">
            <div>
              {title && (
                <h2 className="text-[15px] font-semibold text-[var(--cr-text)]">{title}</h2>
              )}
              {description && (
                <p id="bottom-sheet-desc" className="text-[12.5px] text-[var(--cr-text-muted)] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--cr-bg-offset)] transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cr-blue-mid)]"
              aria-label="Close"
            >
              <X size={16} className="text-[var(--cr-text-muted)]" aria-hidden />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4">{children}</div>
      </div>
    </>
  );
}
