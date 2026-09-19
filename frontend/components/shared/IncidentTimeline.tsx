import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  /** Event title / label */
  label: string;
  /** Optional detail text below the label */
  detail?: string;
  /** ISO 8601 timestamp or any date string */
  timestamp?: string;
  /** Visual state — determines icon/line color */
  status: 'complete' | 'active' | 'pending' | 'error';
  /** Optional icon override (Lucide icon element) */
  icon?: React.ReactNode;
}

interface IncidentTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const statusDot: Record<string, string> = {
  complete: 'bg-[var(--cr-green-mid)] border-[var(--cr-green-light)]',
  active:   'bg-[var(--cr-blue-mid)] border-[var(--cr-blue-light)] ring-2 ring-[var(--cr-blue-light)]',
  pending:  'bg-[var(--cr-border-strong)] border-[var(--cr-border)]',
  error:    'bg-[var(--cr-red)] border-[var(--cr-red-light)]',
};

const labelClass: Record<string, string> = {
  complete: 'text-[var(--cr-text)]',
  active:   'text-[var(--cr-blue-mid)] font-semibold',
  pending:  'text-[var(--cr-text-muted)]',
  error:    'text-[var(--cr-red)]',
};

function formatTimestamp(ts?: string): string | null {
  if (!ts) return null;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

/**
 * IncidentTimeline — vertical event/audit trail for incident details and
 * the public tracking page. Shows a connected dot-and-line progression.
 *
 * Spec (ui-ux.md §17): "Make the timeline the main visual story."
 *
 * @example
 * ```tsx
 * <IncidentTimeline events={[
 *   { id: '1', label: 'Report submitted',     status: 'complete', timestamp: '2026-09-18T10:42:00Z' },
 *   { id: '2', label: 'AI triage completed',  status: 'complete', detail: 'Water Leak · High', timestamp: '2026-09-18T10:43:12Z' },
 *   { id: '3', label: 'Worker assigned',      status: 'complete', detail: 'Water Department',  timestamp: '2026-09-18T11:05:00Z' },
 *   { id: '4', label: 'Repair in progress',   status: 'active' },
 *   { id: '5', label: 'Resolution verified',  status: 'pending' },
 *   { id: '6', label: 'Completed',            status: 'pending' },
 * ]} />
 * ```
 */
export function IncidentTimeline({ events, className }: IncidentTimelineProps) {
  return (
    <ol className={cn('relative', className)} aria-label="Incident history">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        const ts = formatTimestamp(event.timestamp);

        return (
          <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className="absolute left-[7px] top-[20px] bottom-0 w-px bg-[var(--cr-border)]"
                aria-hidden
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                'relative z-10 mt-[3px] w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors duration-[var(--motion-base)]',
                statusDot[event.status]
              )}
              aria-hidden
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    'text-[13.5px] leading-snug transition-colors duration-[var(--motion-fast)]',
                    labelClass[event.status]
                  )}
                  aria-current={event.status === 'active' ? 'step' : undefined}
                >
                  {event.label}
                </span>
                {ts && (
                  <time
                    dateTime={event.timestamp}
                    className="text-[11px] text-[var(--cr-text-muted)] flex-shrink-0 tabular-nums"
                  >
                    {ts}
                  </time>
                )}
              </div>
              {event.detail && (
                <p className="text-[12px] text-[var(--cr-text-muted)] mt-0.5 leading-snug">
                  {event.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
