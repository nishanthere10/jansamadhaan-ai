const severityMap: Record<string, { label: string; className: string; dot: string }> = {
  low:      { label: 'Low',      className: 'cr-badge cr-badge-low',      dot: '#1B7A3E' },
  medium:   { label: 'Medium',   className: 'cr-badge cr-badge-medium',   dot: '#B45309' },
  high:     { label: 'High',     className: 'cr-badge cr-badge-high',     dot: '#EA580C' },
  critical: { label: 'Critical', className: 'cr-badge cr-badge-critical', dot: '#C0392B' },
  emergency:{ label: 'Emergency', className: 'cr-badge cr-badge-critical', dot: '#991B1B' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  // Normalize string for mapping: "Low Risk" -> "low", "Emergency" -> "emergency"
  const normalized = severity.toLowerCase().replace(' risk', '').trim();
  
  // Use config if exists, otherwise fallback
  const config = severityMap[normalized] ?? { label: severity, className: 'cr-badge cr-badge-medium', dot: '#999' };
  
  // If we found a mapped config but the original label had "Risk" (or was explicitly "Emergency"), keep the accurate wording
  const displayLabel = (normalized === 'emergency' || severity.toLowerCase().includes('risk')) ? severity : config.label;

  return (
    <span className={config.className}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dot }}
      />
      {displayLabel}
    </span>
  );
}
