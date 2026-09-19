import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { cn } from '@/lib/utils';

export interface AiEvidenceData {
  severity: string;
  confidence: number; // 0–100
  category: string;
  department: string;
  visualFindings?: string[];
  spamOrValidity?: 'valid' | 'spam' | 'unclear';
  reasoning?: {
    severity?: string;
    routing?: string;
    visual?: string;
    duplicate?: string;
  };
  secondaryRouting?: string;
  isProcessing?: boolean;
}

interface AiEvidencePanelProps {
  data: AiEvidenceData;
  className?: string;
}

/** Confidence bar with label and percentage */
function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 85 ? 'var(--cr-green-mid)'
    : value >= 60 ? 'var(--cr-amber-mid)'
    : 'var(--cr-red)';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cr-text-muted)]">
          Confidence
        </span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="cr-progress" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`AI confidence: ${value}%`}>
        <div
          className="cr-progress-bar transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-out)]"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/** Expandable section */
function Section({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--cr-border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-semibold text-[var(--cr-text-secondary)] bg-[var(--cr-bg)] hover:bg-[var(--cr-bg-offset)] transition-colors duration-[var(--motion-fast)]"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        type="button"
      >
        {label}
        {open ? (
          <ChevronUp size={13} aria-hidden />
        ) : (
          <ChevronDown size={13} aria-hidden />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 text-[12.5px] text-[var(--cr-text-secondary)] leading-relaxed space-y-1 bg-[var(--cr-surface)]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Validity pill */
function ValidityPill({ state }: { state: 'valid' | 'spam' | 'unclear' }) {
  const map = {
    valid:   { label: 'Valid civic evidence', cls: 'bg-[var(--cr-green-light)] text-[var(--cr-green)]' },
    spam:    { label: 'Flagged as spam',       cls: 'bg-[var(--cr-red-light)] text-[var(--cr-red)]' },
    unclear: { label: 'Unclear evidence',      cls: 'bg-[var(--cr-amber-light)] text-[var(--cr-amber)]' },
  };
  const { label, cls } = map[state];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', cls)}>
      {label}
    </span>
  );
}

/**
 * AiEvidencePanel — structured AI analysis display for the authority
 * incident detail view. Shows severity, confidence, department, findings,
 * and expandable reasoning sections. Never shows raw JSON or model names.
 */
export function AiEvidencePanel({ data, className }: AiEvidencePanelProps) {
  const {
    severity,
    confidence,
    category,
    department,
    visualFindings,
    spamOrValidity,
    reasoning,
    secondaryRouting,
  } = data;

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--cr-blue-light)] bg-[var(--cr-blue-pale)] p-4 space-y-4',
        'dark:border-[var(--cr-border)] dark:bg-[var(--cr-surface)]',
        className
      )}
      aria-label="AI assessment"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--cr-blue-light)] flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-[var(--cr-blue-mid)]" aria-hidden />
        </div>
        <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-[var(--cr-blue-mid)]">
          AI Assessment
        </span>
      </div>

      {/* Severity row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cr-text-muted)]">
          Severity
        </span>
        <SeverityBadge severity={severity} />
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={confidence} />

      {/* Category + Department */}
      <div className="space-y-2">
        {[
          { label: 'Category', value: category },
          { label: 'Department', value: department },
          ...(secondaryRouting ? [{ label: 'Also routes to', value: secondaryRouting }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cr-text-muted)] flex-shrink-0">
              {label}
            </span>
            <span className="text-[13px] font-medium text-[var(--cr-text)] text-right">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Validity */}
      {spamOrValidity && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cr-text-muted)]">
            Report validity
          </span>
          <ValidityPill state={spamOrValidity} />
        </div>
      )}

      {/* Expandable sections */}
      <div className="space-y-2">
        {visualFindings && visualFindings.length > 0 && (
          <Section label="Visual evidence">
            <ul className="list-disc list-inside space-y-0.5">
              {visualFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </Section>
        )}

        {reasoning?.severity && (
          <Section label="Severity reasoning">
            {reasoning.severity}
          </Section>
        )}

        {reasoning?.routing && (
          <Section label="Routing reasoning">
            {reasoning.routing}
          </Section>
        )}

        {reasoning?.visual && (
          <Section label="Image observations">
            {reasoning.visual}
          </Section>
        )}

        {reasoning?.duplicate && (
          <Section label="Duplicate context">
            {reasoning.duplicate}
          </Section>
        )}
      </div>

      {/* Uncertainty disclaimer */}
      {confidence < 75 && (
        <div className="flex gap-2 items-start p-2.5 rounded-lg bg-[var(--cr-amber-light)] border border-[rgba(146,64,14,0.15)]">
          <Info size={13} className="text-[var(--cr-amber)] flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[11.5px] text-[var(--cr-amber)] leading-snug">
            Low confidence — human review recommended before finalising this assessment.
          </p>
        </div>
      )}
    </div>
  );
}
