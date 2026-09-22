import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, MinusCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlaState } from '@/types';

interface SlaVisual {
  label: string;
  className: string;
  icon: React.ReactNode;
}

/**
 * Presentation for the server-computed SLA state.
 *
 * The state string comes from ``app/services/sla_service.py`` (the server-side
 * twin of ``lib/sla.ts``) — this component only maps it to a visual. Keeping
 * the mapping here means the public tracker and the authority dashboard cannot
 * disagree about what "BREACHED" looks like.
 */
const SLA_VISUALS: Record<SlaState, SlaVisual> = {
  'ON TRACK': {
    label: 'On Track',
    className: 'cr-badge cr-badge-assigned',
    icon: <Loader2 size={10} strokeWidth={2.5} aria-hidden />,
  },
  'EXPIRING SOON': {
    label: 'Due Soon',
    className: 'cr-badge cr-badge-pending',
    icon: <AlertTriangle size={10} strokeWidth={2.5} aria-hidden />,
  },
  BREACHED: {
    label: 'SLA Breached',
    className: 'cr-badge cr-badge-rejected',
    icon: <ShieldAlert size={10} strokeWidth={2.5} aria-hidden />,
  },
  MET: {
    label: 'SLA Met',
    className: 'cr-badge cr-badge-resolved',
    icon: <CheckCircle2 size={10} strokeWidth={2.5} aria-hidden />,
  },
  CLOSED: {
    label: 'Closed',
    className: 'cr-badge cr-badge-closed',
    icon: <MinusCircle size={10} strokeWidth={2.5} aria-hidden />,
  },
  UNKNOWN: {
    label: 'SLA Unavailable',
    className: 'cr-badge cr-badge-closed',
    icon: <CalendarClock size={10} strokeWidth={2.5} aria-hidden />,
  },
};

interface SlaStateBadgeProps {
  state?: SlaState | string | null;
  /** ISO deadline, rendered inline as "Due 22 Sep, 18:00" when present. */
  dueAt?: string | null;
  className?: string;
}

export function SlaStateBadge({ state, dueAt, className }: SlaStateBadgeProps) {
  const key = (state ?? 'UNKNOWN').toUpperCase() as SlaState;
  const visual = SLA_VISUALS[key] ?? SLA_VISUALS.UNKNOWN;

  // Only a live clock has a meaningful deadline to show.
  const showDue =
    dueAt && (key === 'ON TRACK' || key === 'EXPIRING SOON' || key === 'BREACHED');
  let dueLabel = '';
  if (showDue) {
    const parsed = new Date(dueAt as string);
    if (!Number.isNaN(parsed.getTime())) {
      dueLabel = parsed.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-2 flex-wrap', className)}>
      <span
        className={visual.className}
        role="status"
        aria-label={`Service level: ${visual.label}`}
      >
        {visual.icon}
        {visual.label}
      </span>
      {dueLabel && (
        <span className="text-[11px] font-medium text-[var(--cr-text-muted)] inline-flex items-center gap-1">
          <CalendarClock size={11} aria-hidden />
          Due {dueLabel}
        </span>
      )}
    </span>
  );
}
