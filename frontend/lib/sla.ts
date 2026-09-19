/**
 * Municipal SLA (Service Level Agreement) Engine
 * -----------------------------------------------
 * Calibrated against standard Indian Urban Local Body (ULB) & MoHUA guidelines
 * (e.g. Swachhata-MoHUA & CPGRAMS mandates).
 */

export interface SlaInfo {
  totalHours: number;
  hoursRemaining: number;
  isBreached: boolean;
  isExpiringSoon: boolean; // < 3 hours remaining
  status: 'on-track' | 'expiring' | 'breached' | 'resolved';
  label: string;
  badgeClass: string;
}

// Standard Indian Municipal SLA Targets in Hours
export const MUNICIPAL_SLA_HOURS: Record<string, number> = {
  // Urgent Public Safety & Health (12h)
  'garbage': 12,
  'solid waste management': 12,
  'open manhole': 12,
  'manhole': 12,

  // Critical Utility & Flow (24h)
  'water leak': 24,
  'water-leakage': 24,
  'water supply & pipelines': 24,
  'water supply': 24,
  'stormwater & drainage': 24,
  'drainage': 24,
  'flooding': 24,
  'waterlogging': 24,
  'electricity': 24,
  'electrical danger': 24,
  'streetlight': 24,
  'broken-streetlight': 24,
  'street lighting & electrical': 24,
  'fallen-tree': 24,
  'fallen tree / blockage': 24,
  'public health & sanitation': 24,
  'sanitation': 24,
  'noise & air pollution': 24,
  
  // Infrastructure Repairs (48h)
  'pothole': 48,
  'pothole & road hazard': 48,
  'roads & footpaths': 48,
  'road damage': 48,
  'traffic': 48,
  'parking': 48,

  // Environmental & General (72h)
  'horticulture & greenery': 72,
  'encroachment & traffic': 72,
  'encroachment': 72,
  'other': 72,
};

/**
 * Normalizes any category string or prompt title to known municipal SLA target hours.
 */
function resolveCategoryHours(cat: string): number {
  const clean = cat.toLowerCase().trim();
  if (MUNICIPAL_SLA_HOURS[clean]) return MUNICIPAL_SLA_HOURS[clean];

  // Fuzzy matching for composite labels
  if (clean.includes('garbage') || clean.includes('waste') || clean.includes('dump') || clean.includes('manhole')) return 12;
  if (clean.includes('water') || clean.includes('drain') || clean.includes('flood') || clean.includes('pipe')) return 24;
  if (clean.includes('light') || clean.includes('electric') || clean.includes('wire') || clean.includes('tree')) return 24;
  if (clean.includes('road') || clean.includes('pothole') || clean.includes('footpath') || clean.includes('asphalt')) return 48;
  if (clean.includes('encroach') || clean.includes('tree') || clean.includes('park')) return 72;

  return 48; // Default municipal SLA
}

/**
 * Calculates current SLA status based on ticket creation timestamp, category, and severity.
 */
export function calculateSlaStatus(
  createdAt: string,
  category?: string | null,
  severity?: string | null,
  status?: string | null
): SlaInfo {
  const normStatus = (status || '').toLowerCase().trim();

  // If already resolved or rejected, return terminal SLA state
  if (normStatus === 'resolved') {
    return {
      totalHours: 0,
      hoursRemaining: 0,
      isBreached: false,
      isExpiringSoon: false,
      status: 'resolved',
      label: 'SLA Met',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    };
  }

  if (normStatus === 'rejected') {
    return {
      totalHours: 0,
      hoursRemaining: 0,
      isBreached: false,
      isExpiringSoon: false,
      status: 'resolved',
      label: 'Closed / Rejected',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    };
  }

  // Base SLA allocation with fuzzy resolution
  let baseHours = resolveCategoryHours(category || 'other');

  // Severity modifiers: Critical issues have tightened timelines
  const cleanSev = (severity || 'medium').toLowerCase().trim();
  if (cleanSev === 'critical' || cleanSev === 'emergency') {
    baseHours = Math.max(12, Math.round(baseHours * 0.5)); // Cut SLA in half for emergencies (min 12h)
  } else if (cleanSev === 'low') {
    baseHours = Math.round(baseHours * 1.5);
  }

  const parsedDate = createdAt ? new Date(createdAt).getTime() : Date.now();
  const createdTime = isNaN(parsedDate) ? Date.now() : parsedDate;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - createdTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = baseHours - elapsedHours;

  if (hoursRemaining <= 0) {
    const overdueHours = Math.abs(Math.round(hoursRemaining));
    const overdueLabel = overdueHours < 24 
      ? `Overdue by ${overdueHours}h` 
      : `Overdue by ${Math.round(overdueHours / 24)}d`;

    return {
      totalHours: baseHours,
      hoursRemaining: Math.round(hoursRemaining),
      isBreached: true,
      isExpiringSoon: false,
      status: 'breached',
      label: overdueLabel,
      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-300 dark:border-red-800 font-semibold animate-pulse',
    };
  }

  if (hoursRemaining < 3) {
    const remainingMins = Math.round(hoursRemaining * 60);
    const label = remainingMins < 60 ? `${remainingMins}m left` : `${hoursRemaining.toFixed(1)}h left`;
    return {
      totalHours: baseHours,
      hoursRemaining: Math.round(hoursRemaining),
      isBreached: false,
      isExpiringSoon: true,
      status: 'expiring',
      label,
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-300 dark:border-amber-700 font-medium',
    };
  }

  const roundedHours = Math.round(hoursRemaining);
  const label = roundedHours < 24 
    ? `${roundedHours}h left` 
    : `${Math.round(roundedHours / 24)}d left`;

  return {
    totalHours: baseHours,
    hoursRemaining: roundedHours,
    isBreached: false,
    isExpiringSoon: false,
    status: 'on-track',
    label,
    badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
}
