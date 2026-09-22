import { Archive, CheckCircle2, Clock, Loader2, UserCheck, XCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const statusMap: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    className: 'cr-badge cr-badge-pending',
    icon: <Clock size={10} strokeWidth={2.5} aria-hidden />,
  },
  assigned: {
    label: 'Assigned',
    className: 'cr-badge cr-badge-assigned',
    icon: <UserCheck size={10} strokeWidth={2.5} aria-hidden />,
  },
  'in-progress': {
    label: 'In Progress',
    className: 'cr-badge cr-badge-progress',
    icon: <Loader2 size={10} strokeWidth={2.5} className="animate-spin" aria-hidden />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'cr-badge cr-badge-progress',
    icon: <Loader2 size={10} strokeWidth={2.5} className="animate-spin" aria-hidden />,
  },
  resolved: {
    label: 'Resolved',
    className: 'cr-badge cr-badge-resolved',
    icon: <CheckCircle2 size={10} strokeWidth={2.5} aria-hidden />,
  },
  closed: {
    label: 'Closed',
    className: 'cr-badge cr-badge-closed',
    icon: <Archive size={10} strokeWidth={2.5} aria-hidden />,
  },
  rejected: {
    label: 'Rejected',
    className: 'cr-badge cr-badge-rejected',
    icon: <XCircle size={10} strokeWidth={2.5} aria-hidden />,
  },
  verified: {
    label: 'Verified',
    className: 'cr-badge cr-badge-resolved',
    icon: <ShieldCheck size={10} strokeWidth={2.5} aria-hidden />,
  },
};

/**
 * Human-readable label for any status value, safe for unknown input.
 *
 * Shared with the authority timeline so the badge and the timeline text can
 * never disagree about wording.
 */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  const key = String(status).toLowerCase().trim();
  const known = statusMap[key];
  if (known) return known.label;
  // Unknown status: render a readable Title Case form instead of leaking a
  // raw snake_case enum value into the UI.
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = String(status ?? '').toLowerCase().trim();
  const config = statusMap[key] ?? {
    label: statusLabel(status),
    className: 'cr-badge cr-badge-pending',
    icon: <Clock size={10} strokeWidth={2.5} aria-hidden />,
  };

  return (
    <span
      className={cn(config.className, className)}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
