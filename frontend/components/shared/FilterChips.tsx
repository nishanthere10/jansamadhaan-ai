import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * FilterChips — displays active filter chips with individual remove buttons
 * and a "Clear all" action.
 *
 * Spec (ui-ux.md §29): active filter chips with × for each and one "Clear all".
 *
 * @example
 * <FilterChips
 *   chips={[
 *     { id: 'sev:critical', label: 'Severity: Critical' },
 *     { id: 'dept:water',   label: 'Department: Water'  },
 *   ]}
 *   onRemove={(id) => removeFilter(id)}
 *   onClearAll={clearAllFilters}
 * />
 */
export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn('flex items-center gap-2 flex-wrap', className)}
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-[var(--cr-blue-light)] border border-[rgba(0,85,164,0.2)] text-[12px] font-medium text-[var(--cr-blue-mid)]"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.id)}
            className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-[rgba(0,85,164,0.15)] transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cr-blue-mid)]"
            aria-label={`Remove filter: ${chip.label}`}
          >
            <X size={10} strokeWidth={2.5} aria-hidden />
          </button>
        </span>
      ))}

      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[12px] text-[var(--cr-text-muted)] hover:text-[var(--cr-red)] underline underline-offset-2 transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cr-blue-mid)] rounded"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
