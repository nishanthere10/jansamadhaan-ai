import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { fetchWithAuth } from '../../lib/api';
import { LoadingSpinner } from './LoadingSpinner';
import { Activity, Clock, Image as ImageIcon, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import type { IncidentUpdate, Incident } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Badge } from '../ui/badge';

interface DetailModalProps {
  incidentId: string | null;
  onClose: () => void;
  title?: string;
}

export function IncidentDetailModal({ incidentId, onClose, title }: DetailModalProps) {
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'ai'>('timeline');

  useEffect(() => {
    if (!incidentId) return;
    
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [updatesRes, incidentRes] = await Promise.all([
          fetchWithAuth(`/api/v1/incidents/${incidentId}/updates`),
          fetchWithAuth(`/api/v1/incidents/${incidentId}`),
        ]);
        const updatesJson = await updatesRes.json();
        const incidentJson = await incidentRes.json();
        
        if (isMounted) {
          if (updatesJson.success) setUpdates(updatesJson.data);
          if (incidentJson.success) {
            setIncident(incidentJson.data);
          }
        }
      } catch (err) {
        console.error("Failed to load detail data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [incidentId]);

  return (
    <Dialog open={!!incidentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
             <Activity size={20} className="text-indigo-600" />
             {title || 'Incident Detail'}
          </DialogTitle>
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mt-2">
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'timeline' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Timeline
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`pb-2 text-sm font-semibold transition-colors flex items-center gap-1 ${activeTab === 'ai' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Zap size={14} /> AI Insights
            </button>
          </div>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-70">
              <LoadingSpinner size="lg" />
              <p className="text-sm mt-3 font-medium">Fetching history...</p>
            </div>
          ) : activeTab === 'timeline' ? (
             updates.length === 0 ? (
               <div className="text-center py-10 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                 <Clock size={32} className="mx-auto text-slate-300 mb-3" />
                 <p className="font-medium text-[14px]">No updates recorded yet.</p>
                 <p className="text-[12px] opacity-70">Waiting for authority assignment or AI triage.</p>
               </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-900/50 space-y-8 py-2">
                {updates.map((upd) => (
                  <div key={upd.id} className="relative">
                    {/* Timeline Node */}
                    <div className="absolute -left-[31px] bg-white dark:bg-slate-950 p-1 rounded-full border-2 border-indigo-100 dark:border-indigo-900/50">
                      {upd.status === 'resolved' ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                         <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                           <div className="w-2 h-2 rounded-full bg-indigo-600" />
                         </div>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/60 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge status={upd.status as any} />
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(upd.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>

                      {upd.note && (
                        <div className="mt-3 text-[13px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 font-medium">
                          <span className="text-slate-400 block mb-1 text-[11px] uppercase tracking-wider">Worker Note</span>
                          {upd.note}
                        </div>
                      )}

                      {upd.after_image_url && (
                        <div className="mt-4">
                          <span className="text-slate-400 block mb-2 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <ImageIcon size={12} /> Resolution Proof
                          </span>
                          <a href={upd.after_image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 ring-2 ring-transparent hover:ring-indigo-500 transition-all cursor-zoom-in">
                            <img src={upd.after_image_url} alt="Resolution" className="w-full h-40 object-cover hover:scale-105 transition-transform duration-500" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'ai' && (incident?.ai_structured_data || incident?.ai_category || incident?.ai_vision_analysis || incident?.ai_severity) ? (
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Automated Categorization</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{incident?.ai_category || incident?.category || 'Uncategorized'}</Badge>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">{incident?.ai_department || 'General'}</Badge>
                    <Badge variant={incident?.severity === 'high' || incident?.severity === 'critical' ? 'destructive' : 'default'}>{incident?.severity || 'low'}</Badge>
                  </div>
                </div>
                
                {incident?.ai_structured_data?.hazard_description && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 mt-4">Risk Assessment</h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex gap-2 items-center">
                      <ShieldAlert size={16} className={incident.ai_structured_data.safety_hazard ? 'text-red-500' : 'text-green-500'} />
                      {incident.ai_structured_data.hazard_description}
                    </p>
                  </div>
                )}

                <div>
                   <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 mt-4">Vision Details</h4>
                   <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                     {incident.ai_vision_analysis || "No visual verification performed yet."}
                   </p>
                </div>
                
                {incident.ai_confidence_score && (
                   <div className="mt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                     <span className="text-xs font-bold text-slate-500">AI Confidence Score</span>
                     <span className="text-sm font-mono font-bold text-indigo-600">{(incident.ai_confidence_score * 100).toFixed(1)}%</span>
                   </div>
                )}
              </div>
          ) : (
              <div className="text-center py-10 text-slate-500">
                <Zap size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium">No AI Insights Available</p>
                <p className="text-xs mt-1">This report has not been fully processed by the AI pipeline yet.</p>
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
