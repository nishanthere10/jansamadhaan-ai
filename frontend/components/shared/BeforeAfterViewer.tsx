import React from 'react';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeAfterViewerProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
  aiVerified?: boolean;
  className?: string;
}

/**
 * BeforeAfterViewer — side-by-side before/after image comparison panel.
 *
 * Used in:
 * - Public tracking page (resolved state)
 * - Worker task detail (resolution proof review)
 * - Authority incident detail (verification evidence)
 *
 * Spec (ui-ux.md §17 and §32): "[ Before ] [ After ]" — before/after proof.
 */
export function BeforeAfterViewer({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Before the repair',
  afterAlt  = 'After the repair',
  beforeLabel = 'Before',
  afterLabel  = 'After',
  aiVerified,
  className,
}: BeforeAfterViewerProps) {
  const openImage = (src: string) => window.open(src, '_blank', 'noopener,noreferrer');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--cr-text-muted)]">
            {beforeLabel}
          </span>
          <div className="relative group rounded-xl overflow-hidden border border-[var(--cr-border)] aspect-[4/3] bg-[var(--cr-bg-offset)]">
            <img
              src={beforeSrc}
              alt={beforeAlt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => openImage(beforeSrc)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-[var(--motion-base)] opacity-0 group-hover:opacity-100"
              aria-label={`View full ${beforeLabel} image`}
            >
              <ZoomIn size={20} className="text-white drop-shadow" aria-hidden />
            </button>
          </div>
        </div>

        {/* After */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--cr-text-muted)]">
            {afterLabel}
          </span>
          <div className="relative group rounded-xl overflow-hidden border border-[var(--cr-border)] aspect-[4/3] bg-[var(--cr-bg-offset)]">
            <img
              src={afterSrc}
              alt={afterAlt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => openImage(afterSrc)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-[var(--motion-base)] opacity-0 group-hover:opacity-100"
              aria-label={`View full ${afterLabel} image`}
            >
              <ZoomIn size={20} className="text-white drop-shadow" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* AI verification tag */}
      {aiVerified !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium',
            aiVerified
              ? 'bg-[var(--cr-green-light)] text-[var(--cr-green)] border border-[rgba(26,122,62,0.2)]'
              : 'bg-[var(--cr-amber-light)] text-[var(--cr-amber)] border border-[rgba(146,64,14,0.2)]'
          )}
          role="status"
        >
          <span aria-hidden>{aiVerified ? '✓' : '⚠'}</span>
          {aiVerified ? 'AI verification passed' : 'Verification requires manual review'}
        </div>
      )}
    </div>
  );
}
