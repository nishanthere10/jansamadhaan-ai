import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Supporting subtitle / description */
  subtitle?: string;
  /** Optional breadcrumb items displayed above the title */
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  /** Slot for the primary action button(s) */
  action?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether to show a back button (calls window.history.back by default) */
  showBack?: boolean;
  onBack?: () => void;
  /** Badge / tag displayed inline next to the title */
  badge?: React.ReactNode;
}

/**
 * PageHeader — consistent page-level heading with optional breadcrumb,
 * back button, primary action slot, and inline badge.
 *
 * Spec: ui-ux.md §3.2 — "Make the important thing obvious"
 * One dominant heading per page, one dominant action.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  className,
  showBack = false,
  onBack,
  badge,
}: PageHeaderProps) {
  const handleBack = onBack ?? (() => window.history.back());

  return (
    <header
      className={cn(
        'flex flex-col gap-1 pb-5 mb-5 border-b border-[var(--cr-border)]',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-0.5">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span className="text-[var(--cr-border-strong)] text-[11px]" aria-hidden>
                  /
                </span>
              )}
              {crumb.href || crumb.onClick ? (
                <a
                  href={crumb.href}
                  onClick={crumb.onClick}
                  className="text-[11.5px] text-[var(--cr-text-muted)] hover:text-[var(--cr-blue-mid)] transition-colors duration-[var(--motion-fast)] cursor-pointer"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-[11.5px] text-[var(--cr-text-secondary)] font-medium">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Back button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg border border-[var(--cr-border)] bg-[var(--cr-surface)] hover:bg-[var(--cr-bg-offset)] transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cr-blue-mid)]"
              aria-label="Go back"
              type="button"
            >
              <ArrowLeft size={15} className="text-[var(--cr-text-muted)]" aria-hidden />
            </button>
          )}

          <div className="min-w-0">
            {/* Title + badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="cr-page-title truncate">{title}</h1>
              {badge && <span className="flex-shrink-0">{badge}</span>}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="cr-page-subtitle mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Primary action(s) */}
        {action && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
