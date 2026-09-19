import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyTrackingIdProps {
  trackingId: string;
  className?: string;
  /** Show the full ID or just the label */
  showId?: boolean;
}

/**
 * CopyTrackingId — displays a civic incident tracking ID with a copy button
 * that momentarily changes to "Copied ✓" after being clicked.
 *
 * Spec (ui-ux.md §27): Button temporarily changes "Copy ID" → "Copied ✓".
 *
 * @example
 * <CopyTrackingId trackingId="CIV-2026-91AF" />
 */
export function CopyTrackingId({
  trackingId,
  className,
  showId = true,
}: CopyTrackingIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingId);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = trackingId;
      el.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--cr-border)] bg-[var(--cr-bg-offset)]',
        className
      )}
    >
      {showId && (
        <span className="cr-mono text-[13px] text-[var(--cr-text-secondary)] select-all">
          {trackingId}
        </span>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1 text-[12px] font-medium rounded px-1.5 py-0.5 transition-all duration-[var(--motion-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cr-blue-mid)]',
          copied
            ? 'text-[var(--cr-green-mid)] bg-[var(--cr-green-light)]'
            : 'text-[var(--cr-text-muted)] hover:text-[var(--cr-blue-mid)] hover:bg-[var(--cr-blue-light)]'
        )}
        aria-label={copied ? 'Copied!' : `Copy tracking ID ${trackingId}`}
      >
        {copied ? (
          <>
            <Check size={12} strokeWidth={2.5} aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Copy size={12} strokeWidth={2} aria-hidden />
            Copy ID
          </>
        )}
      </button>
    </div>
  );
}
