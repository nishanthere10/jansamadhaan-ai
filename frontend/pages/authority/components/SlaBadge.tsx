import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateSlaStatus } from '../../../lib/sla';

interface SlaBadgeProps {
  createdAt: string;
  category?: string | null;
  severity?: string | null;
  status?: string | null;
  showIcon?: boolean;
  className?: string;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  createdAt,
  category,
  severity,
  status,
  showIcon = true,
  className = '',
}) => {
  const sla = calculateSlaStatus(createdAt, category, severity, status);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border tracking-tight transition-colors ${sla.badgeClass} ${className}`}
      title={`Municipal SLA Target: ${sla.totalHours}h. Status: ${sla.label}`}
    >
      {showIcon && (
        <>
          {sla.status === 'breached' && <AlertCircle size={12} className="text-red-600 dark:text-red-400 shrink-0" />}
          {sla.status === 'expiring' && <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />}
          {sla.status === 'on-track' && <Clock size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />}
          {sla.status === 'resolved' && <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
        </>
      )}
      <span>{sla.label}</span>
    </span>
  );
};
