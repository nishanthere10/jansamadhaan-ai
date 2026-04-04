const statusMap: Record<string, { label: string; className: string; dot: string }> = {
  pending:     { label: 'Pending',     className: 'cr-badge cr-badge-pending',  dot: '#B45309' },
  assigned:    { label: 'Assigned',    className: 'cr-badge cr-badge-assigned', dot: '#0055A4' },
  'in-progress': { label: 'In Progress', className: 'cr-badge cr-badge-progress', dot: '#2563EB' },
  resolved:    { label: 'Resolved',    className: 'cr-badge cr-badge-resolved', dot: '#1B7A3E' },
  rejected:    { label: 'Rejected',    className: 'cr-badge cr-badge-rejected', dot: '#C0392B' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] ?? { label: status, className: 'cr-badge cr-badge-pending', dot: '#999' };
  return (
    <span className={config.className}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dot }}
      />
      {config.label}
    </span>
  );
}
