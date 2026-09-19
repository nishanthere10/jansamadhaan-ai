import { AlertCircle, AlertTriangle, ArrowDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeverityConfig {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const severityMap: Record<string, SeverityConfig> = {
  low: {
    label: 'Low',
    className: 'cr-badge cr-badge-low',
    icon: <ArrowDown size={10} strokeWidth={2.5} aria-hidden />,
  },
  medium: {
    label: 'Medium',
    className: 'cr-badge cr-badge-medium',
    icon: <AlertTriangle size={10} strokeWidth={2.5} aria-hidden />,
  },
  high: {
    label: 'High',
    className: 'cr-badge cr-badge-high',
    icon: <AlertCircle size={10} strokeWidth={2.5} aria-hidden />,
  },
  critical: {
    label: 'Critical',
    className: 'cr-badge cr-badge-critical',
    icon: <Zap size={10} strokeWidth={2.5} aria-hidden />,
  },
  emergency: {
    label: 'Emergency',
    className: 'cr-badge cr-badge-critical',
    icon: <Zap size={10} strokeWidth={2.5} aria-hidden />,
  },
};

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  // Normalize: "Low Risk" → "low", "Emergency" → "emergency"
  const normalized = severity.toLowerCase().replace(' risk', '').trim();
  const config = severityMap[normalized] ?? {
    label: severity,
    className: 'cr-badge cr-badge-medium',
    icon: <AlertTriangle size={10} strokeWidth={2.5} aria-hidden />,
  };

  // Keep the original wording for "Emergency" or labels with "Risk"
  const displayLabel =
    normalized === 'emergency' || severity.toLowerCase().includes('risk')
      ? severity
      : config.label;

  return (
    <span
      className={cn(config.className, className)}
      role="status"
      aria-label={`Severity: ${displayLabel}`}
    >
      {config.icon}
      {displayLabel}
    </span>
  );
}
