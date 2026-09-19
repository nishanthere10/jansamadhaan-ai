import { cn } from "@/lib/utils"

/**
 * Skeleton — base shimmer primitive.
 *
 * Usage: wrap in a Skeleton wrapper or use the named composition exports.
 * Only use <Spinner> / <LoadingSpinner> for button submits and short inline actions.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-[var(--cr-border)] dark:bg-[var(--cr-border-strong)]",
        className
      )}
      {...props}
    />
  )
}

// ── Composed skeleton patterns ─────────────────────────────────────────────

/** KPI / stat card skeleton — matches .cr-stat-card layout */
function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[var(--cr-border)] p-5 space-y-3 bg-[var(--cr-surface)] shadow-[var(--cr-shadow)]",
        className
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  )
}

/** Incident table row skeleton — matches IncidentRow layout */
function IncidentRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-[var(--cr-divider)] px-4 py-3.5",
        className
      )}
    >
      <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-2.5 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" />
      <Skeleton className="h-5 w-24 rounded-full flex-shrink-0" />
      <Skeleton className="h-7 w-16 rounded-md flex-shrink-0" />
    </div>
  )
}

/** AI evidence panel skeleton — matches AiEvidencePanel layout */
function AiPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Severity row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {/* Confidence bar */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {/* Department + category rows */}
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
      {/* Expandable findings placeholder */}
      <div className="border border-[var(--cr-border)] rounded-lg p-3 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-3/4" />
      </div>
    </div>
  )
}

/** Analytics / chart card skeleton */
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--cr-border)] p-5 bg-[var(--cr-surface)] shadow-[var(--cr-shadow)] space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      {/* Bar chart placeholder */}
      <div className="flex items-end gap-2 h-32 pt-4">
        {[60, 85, 45, 70, 95, 55, 80].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      {/* Legend row */}
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Notification item skeleton */
function NotificationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 p-3 border-b border-[var(--cr-divider)]", className)}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-2.5 w-10 flex-shrink-0" />
    </div>
  )
}

export {
  Skeleton,
  KpiSkeleton,
  IncidentRowSkeleton,
  AiPanelSkeleton,
  ChartSkeleton,
  NotificationSkeleton,
}
