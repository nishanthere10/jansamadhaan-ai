import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiStepStatus = 'complete' | 'active' | 'pending' | 'error';

export interface AiTimelineStep {
  id: string;
  label: string;
  status: AiStepStatus;
  /** Optional detail text shown below the label when status is active or error */
  detail?: string;
}

interface AiStatusTimelineProps {
  steps: AiTimelineStep[];
  className?: string;
}

const stepIcon = {
  complete: (
    <CheckCircle2 size={14} className="text-[var(--cr-green-mid)] flex-shrink-0" aria-hidden />
  ),
  active: (
    <Loader2
      size={14}
      className="text-[var(--cr-blue-mid)] flex-shrink-0 animate-spin"
      aria-hidden
    />
  ),
  pending: <Circle size={14} className="text-[var(--cr-border-strong)] flex-shrink-0" aria-hidden />,
  error: <XCircle size={14} className="text-[var(--cr-red)] flex-shrink-0" aria-hidden />,
};

const stepTextClass: Record<AiStepStatus, string> = {
  complete: 'text-[var(--cr-text)]',
  active: 'text-[var(--cr-blue-mid)] font-semibold',
  pending: 'text-[var(--cr-text-muted)]',
  error: 'text-[var(--cr-red)]',
};

/**
 * AiStatusTimeline — reusable AI pipeline progress indicator.
 *
 * Replaces generic spinners with a vertical checklist that shows exactly
 * which step the AI is on, making the system feel transparent rather
 * than mysterious.
 *
 * @example
 * ```tsx
 * <AiStatusTimeline steps={[
 *   { id: 'recv',   label: 'Report received',   status: 'complete' },
 *   { id: 'img',    label: 'Image inspected',   status: 'complete' },
 *   { id: 'class',  label: 'Classifying',        status: 'active'  },
 *   { id: 'sev',    label: 'Assessing severity', status: 'pending' },
 *   { id: 'route',  label: 'Routing department', status: 'pending' },
 * ]} />
 * ```
 */
export function AiStatusTimeline({ steps, className }: AiStatusTimelineProps) {
  return (
    <ol
      className={cn('flex flex-col gap-2', className)}
      aria-label="AI processing status"
    >
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-start gap-2.5">
          {/* Icon */}
          <span className="mt-0.5 flex-shrink-0" aria-hidden>
            {stepIcon[step.status]}
          </span>

          {/* Connector line below icon, except last */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Step label */}
            <span
              className={cn('text-[13px] leading-snug transition-colors duration-[var(--motion-fast)]', stepTextClass[step.status])}
              aria-current={step.status === 'active' ? 'step' : undefined}
            >
              {step.label}
            </span>
            {/* Detail — only shown for active/error */}
            {step.detail && step.status !== 'pending' && step.status !== 'complete' && (
              <span className="text-[11px] text-[var(--cr-text-muted)] mt-0.5 leading-snug">
                {step.detail}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Preset step factories ─────────────────────────────────────────────────
/** Standard report triage pipeline steps */
export function reportTriageSteps(activeStep: number): AiTimelineStep[] {
  const labels = [
    { id: 'recv',    label: 'Report received'      },
    { id: 'img',     label: 'Image inspected'       },
    { id: 'lang',    label: 'Language normalized'   },
    { id: 'class',   label: 'Classifying'           },
    { id: 'sev',     label: 'Assessing severity'    },
    { id: 'route',   label: 'Routing department'    },
    { id: 'dup',     label: 'Duplicate check'       },
  ];
  return labels.map((s, i) => ({
    ...s,
    status:
      i < activeStep ? 'complete'
      : i === activeStep ? 'active'
      : 'pending',
  }));
}

/** Resolution verification pipeline steps */
export function verificationSteps(activeStep: number): AiTimelineStep[] {
  const labels = [
    { id: 'upload', label: 'Proof uploaded'         },
    { id: 'before', label: 'Before image loaded'    },
    { id: 'after',  label: 'After image analysed'   },
    { id: 'compare',label: 'Comparing evidence'     },
    { id: 'result', label: 'Verification complete'  },
  ];
  return labels.map((s, i) => ({
    ...s,
    status:
      i < activeStep ? 'complete'
      : i === activeStep ? 'active'
      : 'pending',
  }));
}
