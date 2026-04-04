import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';

import { useDashboardState } from './hooks/useDashboardState';
import { DashboardStats } from './components/DashboardStats';
import { DashboardFilters } from './components/DashboardFilters';
import { IncidentTable } from './components/IncidentTable';
import { IncidentRow } from './components/IncidentRow';
import { ExpandedAiPanel } from './components/ExpandedAiPanel';
import { ConfirmDispatchDialog } from './components/ConfirmDispatchDialog';
import { BatchActionBar } from './components/BatchActionBar';

export default function AuthorityDashboard() {
  const { state, actions, helpers } = useDashboardState();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <motion.div className="cr-page-header" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="cr-page-title flex items-center gap-2">
          <BrainCircuit size={28} className="text-[var(--cr-blue-mid)]"/> Command Center
        </h1>
        <p className="cr-page-subtitle">Monitor, triage and assign civic incidents with AI Assistance.</p>
      </motion.div>

      <DashboardStats loading={state.loading} counts={state.counts} />

      <motion.div 
        className="cr-card p-0 overflow-hidden shadow-lg border border-[var(--cr-border)]" 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
      >
        <DashboardFilters 
          loading={state.loading}
          filteredCount={state.filteredIncidents.length}
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          filterRisk={state.filterRisk}
          setFilterRisk={actions.setFilterRisk}
          filterStatus={state.filterStatus}
          setFilterStatus={actions.setFilterStatus}
          filterDept={state.filterDept}
          setFilterDept={actions.setFilterDept}
          uniqueDepartments={state.uniqueDepartments}
          filtersActive={state.filtersActive}
          onReset={actions.resetFilters}
          onRefresh={actions.load}
        />

        <IncidentTable 
          loading={state.loading} 
          totalIncidents={state.incidents.length}
          filteredCount={state.filteredIncidents.length}
          isAllSelected={state.selectedIds.size > 0 && state.selectedIds.size === state.filteredIncidents.length}
          onToggleSelectAll={(e) => actions.toggleSelectAll(state.selectedIds.size === state.filteredIncidents.length)}
          onResetFilters={actions.resetFilters}
        >
          {state.filteredIncidents.map((inc) => (
            <React.Fragment key={inc.id}>
              <IncidentRow 
                incident={inc}
                isSelected={state.selectedIds.has(inc.id)}
                isExpanded={state.expandedId === inc.id}
                onToggleSelect={() => actions.toggleSelect(inc.id)}
                onExpand={() => actions.handleExpand(inc.id)}
                timeAgo={helpers.timeAgo(inc.created_at)}
                timeAgoColor={helpers.timeAgoColor(inc)}
                isAiPending={helpers.isAiPending(inc)}
                isAiDone={helpers.isAiDone(inc)}
                isAiFailed={helpers.isAiFailed(inc)}
                workerName={helpers.workerName(inc.assigned_to)}
              >
                {state.expandedId === inc.id && (
                  <ExpandedAiPanel 
                    incident={inc}
                    isAiPending={helpers.isAiPending(inc)}
                    isAiFailed={helpers.isAiFailed(inc)}
                    incidentUpdates={state.incidentUpdates[inc.id] || []}
                    workers={state.workers}
                    onReprocessAI={actions.reprocessAI}
                    onAcceptAiTriage={actions.acceptAiTriage}
                    onSetConfirmAssign={actions.setConfirmAssign}
                  />
                )}
              </IncidentRow>
            </React.Fragment>
          ))}
        </IncidentTable>
      </motion.div>

      <BatchActionBar 
        selectedCount={state.selectedIds.size}
        workers={state.workers}
        onBatchAcceptTriage={actions.batchAcceptTriage}
        onBatchAssignWorker={actions.batchAssignWorker}
        onDeselectAll={() => actions.setSelectedIds(new Set())}
      />

      <ConfirmDispatchDialog 
        confirmAssign={state.confirmAssign}
        workers={state.workers}
        workerName={helpers.workerName}
        onClose={() => actions.setConfirmAssign(null)}
        onConfirm={(incidentId, workerId) => {
          actions.assignWorker(incidentId, workerId);
          toast.success("Incident officially transferred and dispatched");
        }}
      />
    </div>
  );
}
