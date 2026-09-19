import React from 'react';
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  /** Short, human-readable title — never "Something went wrong." alone */
  title: string;
  /** Calm, specific explanation of what happened and that the user isn't at fault */
  description?: string;
  /** Primary recovery action label */
  onRetry?: () => void;
  retryLabel?: string;
  /** Secondary fallback action (e.g. "Continue Tracking") */
  onFallback?: () => void;
  fallbackLabel?: string;
  /** Error code for support reference (shown discreetly, not prominently) */
  errorCode?: string;
  className?: string;
  /** 'page' = full-page centered; 'inline' = inside a card/panel */
  variant?: 'page' | 'inline';
}

/**
 * ErrorState — calm, specific, and actionable error display.
 *
 * Rules (ui-ux.md §23):
 * - Never use "Something went wrong." by itself
 * - Always explain what happened + what the user can do
 * - For AI failures: distinguish between "AI unavailable" and "rejected"
 * - Distinguish between a backend failure and a user-caused validation error
 *
 * @example
 * <ErrorState
 *   title="AI review unavailable"
 *   description="Your report was received successfully. A municipal officer will review it manually."
 *   onRetry={handleRetry}
 *   onFallback={() => navigate('/track/' + id)}
 *   fallbackLabel="Continue Tracking"
 * />
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  onFallback,
  fallbackLabel,
  errorCode,
  className,
  variant = 'page',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center text-center',
        variant === 'page' ? 'py-20 px-4 justify-center' : 'py-8 px-4',
        className
      )}
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[var(--cr-red-light)] border border-[rgba(185,28,28,0.15)] flex items-center justify-center mb-5 flex-shrink-0">
        <AlertCircle size={22} className="text-[var(--cr-red)]" aria-hidden />
      </div>

      {/* Copy */}
      <h2 className="text-[16px] font-semibold text-[var(--cr-text)] mb-2 max-w-xs">
        {title}
      </h2>
      {description && (
        <p className="text-[13.5px] text-[var(--cr-text-muted)] max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}

      {/* Actions */}
      {(onRetry || onFallback) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {onRetry && (
            <Button variant="authority" size="sm" onClick={onRetry}>
              <RefreshCw size={14} aria-hidden />
              {retryLabel}
            </Button>
          )}
          {onFallback && fallbackLabel && (
            <Button variant="outline" size="sm" onClick={onFallback}>
              {fallbackLabel}
              <ArrowRight size={14} aria-hidden />
            </Button>
          )}
        </div>
      )}

      {/* Error code — discreet, not prominent */}
      {errorCode && (
        <p className="mt-4 text-[10.5px] font-mono text-[var(--cr-text-muted)]">
          Error ref: {errorCode}
        </p>
      )}
    </div>
  );
}
