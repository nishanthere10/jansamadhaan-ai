import React from 'react';
import { motion } from 'framer-motion';
import { FileX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--cr-border)] flex items-center justify-center mb-4">
        <FileX size={24} className="text-[var(--cr-text-muted)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--cr-text)] mb-1">{title}</h3>
      <p className="text-[13px] text-[var(--cr-text-muted)] max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
