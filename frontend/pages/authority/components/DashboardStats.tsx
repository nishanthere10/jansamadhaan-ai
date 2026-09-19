import React from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';

export interface DashboardStatsProps {
  loading: boolean;
  counts: {
    total: string;
    pending: number;
    inProgress: number;
    critical: number;
    clustered: number;
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ loading, counts }) => {
  if (loading) return null;

  const statItems = [
    { label: 'Total Reports', value: counts.total, color: 'var(--cr-blue-mid)' },
    { label: 'Pending Review', value: counts.pending, color: 'var(--cr-amber)' },
    { label: 'Active Dispatches', value: counts.inProgress, color: '#2563EB' },
    { label: 'Critical Alert', value: counts.critical, color: 'var(--cr-red)' },
    { label: 'Clustered', value: counts.clustered, color: '#EA580C' },
  ];

  return (
    <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {statItems.map((stat) => (
         <motion.div 
           key={stat.label} 
           className="cr-stat-card border-none p-3.5 sm:p-4 bg-[var(--cr-surface)] shadow-md shadow-[var(--cr-bg-offset)] ring-1 ring-[var(--cr-border)] last:col-span-2 sm:last:col-span-1" 
           whileHover={{ y: -3 }}
         >
           <div className="text-[22px] sm:text-[26px] font-bold leading-none mb-1" style={{ color: stat.color }}>{stat.value}</div>
           <div className="text-[11px] sm:text-[12px] text-[var(--cr-text-muted)] font-medium uppercase tracking-wider">{stat.label}</div>
         </motion.div>
      ))}
    </motion.div>
  );
};
