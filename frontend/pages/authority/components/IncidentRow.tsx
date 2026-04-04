import React from 'react';
import { ChevronDown, AlertTriangle, CheckCircle2, Activity, Zap, UserCheck, Clock } from 'lucide-react';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { SeverityBadge } from '../../../components/shared/SeverityBadge';
import type { Incident } from '../../../types';

export interface IncidentRowProps {
  incident: Incident;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onExpand: () => void;
  timeAgo: string;
  timeAgoColor: string;
  isAiPending: boolean;
  isAiDone: boolean;
  isAiFailed: boolean;
  workerName: string | null;
  children?: React.ReactNode;
}

export const IncidentRow: React.FC<IncidentRowProps> = ({
  incident: inc,
  isSelected,
  isExpanded,
  onToggleSelect,
  onExpand,
  timeAgo,
  timeAgoColor,
  isAiPending,
  isAiDone,
  isAiFailed,
  workerName,
  children
}) => {
  return (
    <>
      <tr 
        className={`cursor-pointer transition-colors ${isSelected ? 'bg-[var(--cr-blue-light)]/30' : isExpanded ? 'bg-[var(--cr-blue-light)]/20' : 'hover:bg-[var(--cr-surface)]'}`} 
        onClick={onExpand}
      >
        <td className="p-4" onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={onToggleSelect} 
            className="rounded border-[var(--cr-border)] accent-[var(--cr-primary)] cursor-pointer" 
          />
        </td>
        <td className="p-4">
          <span className="font-mono text-[12px] font-bold text-[var(--cr-text)]">{inc.tracking_id}</span>
        </td>
        <td className="p-4">
          <div className="font-semibold text-[14px] text-[var(--cr-text)] flex items-center gap-2">
             {inc.title}
             {inc.ai_structured_data ? (
               inc.ai_structured_data.is_spam ? (
                 <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold border border-red-200" title={`Reason: ${inc.ai_structured_data.spam_reason}`}>
                   <AlertTriangle size={10} /> Likely Spam
                 </span>
               ) : (
                 <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold border border-green-200" title="Integrity Gatekeeper: Passed">
                   <CheckCircle2 size={10} /> Verified Genuine
                 </span>
               )
             ) : null}
          </div>
          <div className="text-[12px] text-[var(--cr-text-muted)] mt-0.5 truncate max-w-[200px]">{inc.description}</div>
          
          {(inc.duplicate_count != null && inc.duplicate_count > 0) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">
                🔥 {inc.duplicate_count} Related Complaint{inc.duplicate_count > 1 ? 's' : ''}
              </span>
              {inc.is_primary_incident && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                  Primary
                </span>
              )}
            </div>
          )}
        </td>
        <td className="p-4">
          <div className="flex flex-col gap-1.5">
            <SeverityBadge severity={inc.severity} />
            {(inc.priority_score !== undefined && inc.priority_score !== null) && (
              <div className="text-[10px] text-[var(--cr-text-muted)] font-medium flex items-center gap-1">
                <Activity size={10} /> Priority Score: {Math.round(inc.priority_score * 100)}/100
              </div>
            )}
            {inc.ai_severity && inc.ai_severity.toLowerCase() !== inc.severity.toLowerCase() && (
              <div className="text-[10px] text-[var(--cr-amber)] font-bold">AI Suggests: {inc.ai_severity}</div>
            )}
          </div>
        </td>
        <td className="p-4">
          {isAiPending && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-200 animate-pulse">
              <Zap size={10} /> Processing
            </span>
          )}
          {isAiDone && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold border border-green-200">
              <CheckCircle2 size={10} /> Complete
            </span>
          )}
          {isAiFailed && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200">
              <AlertTriangle size={10} /> Failed
            </span>
          )}
          {!inc.ai_processing_status && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-semibold border border-gray-200">
              — None
            </span>
          )}
        </td>
        <td className="p-4"><StatusBadge status={inc.status} /></td>
        <td className="p-4">
          {workerName ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
              <UserCheck size={10} /> {workerName}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--cr-text-muted)] italic border border-dashed border-[var(--cr-border)] px-2 py-0.5 rounded-full">Unassigned</span>
          )}
        </td>
        <td className="p-4">
          <span className="text-[11px] font-medium" style={{ color: timeAgoColor }}>
            <Clock size={10} className="inline mr-1" />{timeAgo}
          </span>
        </td>
        <td className="p-4 text-right">
          <ChevronDown size={18} className={`inline-block text-[var(--cr-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
        </td>
      </tr>
      
      {/* Expanded AI Panel */}
      {children}
    </>
  );
};
