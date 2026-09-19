import React from 'react';
import { motion } from 'framer-motion';
import { FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Lucide icon element or any ReactNode to display in the icon well */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** 'default' = centered page fill; 'inline' = compact inside a card */
  variant?: 'default' | 'inline';
}

/**
 * EmptyState — every empty state answers two questions:
 *   1. Is something wrong?
 *   2. What should I do?
 *
 * Use illustrations/icons, not emojis.
 * Always provide an action when the user can resolve the empty state.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const defaultIcon = <FileX aria-hidden className="w-6 h-6 text-[var(--cr-text-muted)]" />;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' ? 'py-20 px-4' : 'py-10 px-4',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
    >
      {/* Icon well */}
      <div
        className={cn(
          'rounded-2xl bg-[var(--cr-bg-offset)] border border-[var(--cr-border)] flex items-center justify-center mb-5 flex-shrink-0',
          variant === 'default' ? 'w-16 h-16' : 'w-12 h-12'
        )}
        aria-hidden
      >
        {icon ?? defaultIcon}
      </div>

      {/* Copy */}
      <h3 className="text-[15px] font-semibold text-[var(--cr-text)] mb-1 max-w-xs">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[var(--cr-text-muted)] max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
