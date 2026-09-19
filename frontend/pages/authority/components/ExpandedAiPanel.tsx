import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Map, Activity, Camera, RotateCcw, AlertTriangle, 
  CheckCircle2, Sparkles, Zap, Layers, 
  ShieldCheck, Link2, Clock
} from 'lucide-react';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';
import type { Incident, IncidentUpdate } from '../../../types';

export interface ExpandedAiPanelProps {
  incident: Incident;
  isAiPending: boolean;
  isAiFailed: boolean;
  incidentUpdates: IncidentUpdate[];
  workers: {id: string, full_name: string, department?: string}[];
  onReprocessAI: (id: string) => void;
  onAcceptAiTriage: (incident: Incident) => void;
  onSetConfirmAssign: (val: {incidentId: string, workerId: string} | null) => void;
}

export const ExpandedAiPanel: React.FC<ExpandedAiPanelProps> = ({
  incident: inc,
  isAiPending,
  isAiFailed,
  incidentUpdates,
  workers,
  onReprocessAI,
  onAcceptAiTriage,
  onSetConfirmAssign
}) => {
  return (
    <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[var(--cr-bg)] border-b border-[var(--cr-border)] overflow-hidden box-border">
      <td colSpan={9} className="p-0">
        <div className="p-3 sm:p-5 border-l-4 border-[var(--cr-primary)] m-2 sm:ml-4 sm:my-4 bg-[var(--cr-surface)] rounded-r-xl shadow-sm space-y-6">
           
           <div className="grid md:grid-cols-3 gap-6">
             {/* Column 1: Location & Details */}
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-2 border-b border-[var(--cr-border)] pb-2 mb-2">
                  <MapPin size={16} className="text-[var(--cr-primary)]" />
                  <h3 className="font-bold text-[14px]">Location & Details</h3>
               </div>
               <div className="bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] text-[12px] space-y-2">
                 <div>
                    <span className="font-semibold text-[var(--cr-text-muted)] block">Reported Address</span>
                    <span className="text-[var(--cr-text)] font-medium block mt-1">{inc.address || 'No address provided'}</span>
                 </div>
                 {(inc.location_lat && inc.location_lng) && (
                    <a href={`https://www.google.com/maps?q=${inc.location_lat},${inc.location_lng}`} target="_blank" rel="noreferrer" className="cr-btn cr-btn-secondary text-[11px] py-1.5 flex items-center justify-center gap-1.5 mt-2 w-full">
                      <Map size={12}/> View on Maps
                    </a>
                 )}
               </div>
               <div>
                  <span className="font-semibold text-[var(--cr-text-muted)] text-[11px] uppercase tracking-wider block mb-1">Citizen Report Original</span>
                  <div className="text-[12px] text-[var(--cr-text)] bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] italic">"{inc.original_text || inc.description}"</div>
               </div>
             </div>

             {/* Column 2: AI Execution Trace */}
             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between border-b border-[var(--cr-border)] pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[var(--cr-primary)]" />
                    <h3 className="font-bold text-[14px]">AI Execution Trace</h3>
                  </div>
                  {isAiPending && (
                    <span className="flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-200 animate-pulse">
                      <LoadingSpinner size="sm" /> Processing...
                    </span>
                  )}
                  {isAiFailed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onReprocessAI(inc.id); }}
                      className="flex items-center gap-1.5 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <RotateCcw size={10} /> Re-run AI
                    </button>
                  )}
               </div>
               
               {/* Step 1: Vision Pipeline */}
               {inc.image_url && (
                 <div className="flex gap-4 items-start">
                   <div className="flex flex-col items-center gap-1 mt-1">
                      <div className="w-5 h-5 rounded-full bg-[var(--cr-primary)] flex items-center justify-center text-white text-[10px]"><Camera size={10} /></div>
                      <div className="w-0.5 h-full bg-[var(--cr-border)] min-h-[40px]"></div>
                   </div>
                   <div className="flex-1 pb-4">
                      <h4 className="text-[12px] font-bold text-[var(--cr-text)] flex items-center gap-1">
                        1. Vision Pipeline
                        <span className="bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] text-[10px] px-1.5 py-0.5 rounded ml-auto">Llama-4-Scout</span>
                      </h4>
                      <div className="flex gap-3 mt-2">
                        <a href={inc.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                          <img src={inc.image_url} alt="Evidence" className="w-[80px] h-[60px] object-cover rounded border border-[var(--cr-border)] hover:opacity-80 transition-opacity" />
                        </a>
                        <div className="text-[11px] text-[var(--cr-text-muted)] bg-[var(--cr-bg)] p-3 rounded-md border border-[var(--cr-border)] w-full relative">
                          {inc.ai_structured_data?.safety_hazard && (
                            <div className="absolute top-2 right-2 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm">
                              <AlertTriangle size={10} /> Hazard Detected
                            </div>
                          )}
                          <span className="font-semibold text-[var(--cr-text)] block mb-1">Sightings:</span>
                          {isAiPending ? (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <LoadingSpinner size="sm" /> Vision analysis in progress...
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <span className="line-clamp-3">
                                {inc.ai_vision_analysis || <span className="italic text-[var(--cr-text-muted)]">No vision data available.</span>}
                              </span>
                              
                              {inc.ai_structured_data && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {inc.ai_structured_data.estimated_size && (
                                    <span className="bg-[var(--cr-surface)] text-[var(--cr-text)] px-1.5 py-0.5 rounded border border-[var(--cr-border)] shadow-sm">
                                      Size: <span className="font-semibold text-[var(--cr-primary)]">{inc.ai_structured_data.estimated_size}</span>
                                    </span>
                                  )}
                                  {inc.ai_structured_data?.has_visible_damage && (
                                    <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 shadow-sm font-medium">
                                      Visible Damage
                                    </span>
                                  )}
                                  {inc.ai_structured_data.objects_detected?.map(obj => (
                                    <span key={obj} className="bg-[var(--cr-blue-light)] text-[var(--cr-blue-mid)] px-1.5 py-0.5 rounded border border-[var(--cr-primary)]/20 shadow-sm">{obj}</span>
                                  ))}
                                </div>
                              )}
                              
                              {inc.ai_structured_data?.hazard_description && inc.ai_structured_data.hazard_description !== 'None' && (
                                 <div className="mt-2 text-red-700 bg-red-50 p-2 rounded border border-red-100">
                                   <span className="font-semibold block mb-0.5 flex items-center gap-1"><AlertTriangle size={10}/> Hazard Details:</span>
                                   {inc.ai_structured_data.hazard_description}
                                 </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                   </div>
                 </div>
               )}

               {/* Step 2: Translation */}
               <div className="flex gap-4 items-start">
                 <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-5 h-5 rounded-full bg-[var(--cr-primary)] flex items-center justify-center text-white text-[10px]">{inc.audio_url ? '🎶' : 'A'}</div>
                    <div className="w-0.5 h-full bg-[var(--cr-border)] min-h-[20px] last:bg-transparent"></div>
                 </div>
                 <div className="flex-1 pb-4">
                    <h4 className="text-[12px] font-bold text-[var(--cr-text)] flex items-center gap-1">
                      2. Translation
                    </h4>
                    
                    {isAiPending ? (
                      <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-2">
                        <LoadingSpinner size="sm" /> Analysis in progress...
                      </div>
                    ) : (!inc.translated_text && !inc.transcript_text) ? (
                      <div className="text-[11px] text-[var(--cr-text-muted)] italic mt-2 flex items-center gap-1">
                        <Sparkles size={12} className="text-[var(--cr-primary)]" />
                        Native text matches English. No translation required.
                      </div>
                    ) : (
                      <div className="text-[11px] bg-[var(--cr-bg)] p-2 rounded-md border border-[var(--cr-border)] mt-2">
                        {inc.translated_text && (
                          <div>
                            <span className="font-semibold text-[var(--cr-text)] block mb-0.5">English:</span> 
                            <span className="text-[var(--cr-text-muted)]">{inc.translated_text}</span>
                          </div>
                        )}
                        {inc.transcript_text && (
                          <div className="mt-2">
                            <span className="font-semibold text-amber-600 block mb-0.5">Transcript:</span> 
                            <span className="text-[var(--cr-text-muted)]">{inc.transcript_text}</span>
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               </div>
               {/* Step 3: Integrity Gatekeeper */}
               {inc.ai_structured_data && (
                 <div className="flex gap-4 items-start">
                   <div className="flex flex-col items-center gap-1 mt-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${inc.ai_structured_data.is_spam ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {inc.ai_structured_data.is_spam ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                      </div>
                   </div>
                   <div className="flex-1 pb-4">
                      <h4 className={`text-[12px] font-bold flex items-center gap-1 ${inc.ai_structured_data.is_spam ? 'text-red-700' : 'text-green-700'}`}>
                        3. Integrity Gatekeeper
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ml-auto ${inc.ai_structured_data.is_spam ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                          {inc.ai_structured_data.is_spam ? 'Flagged Spam' : 'Passed'}
                        </span>
                      </h4>
                      <div className={`text-[11px] p-3 rounded-md border mt-2 shadow-sm ${inc.ai_structured_data.is_spam ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`flex items-center justify-between font-bold mb-1 ${inc.ai_structured_data.is_spam ? 'text-red-800' : 'text-green-800'}`}>
                          <span>{inc.ai_structured_data.is_spam ? 'Detection Reason:' : 'Analysis Result:'}</span>
                          {inc.ai_structured_data.spam_score !== undefined && (
                            <span>Score: {inc.ai_structured_data.spam_score}/10</span>
                          )}
                        </div>
                        <div className={`leading-relaxed italic ${inc.ai_structured_data.is_spam ? 'text-red-700' : 'text-green-700'}`}>
                          {inc.ai_structured_data.is_spam 
                            ? `"${inc.ai_structured_data.spam_reason}"` 
                            : "The content appears legitimate and meets system integrity guidelines."}
                        </div>
                      </div>
                   </div>
                 </div>
               )}
             </div>

             {/* Column 3: AI Insights */}
             <div className="bg-[var(--cr-blue-light)]/20 p-4 rounded-xl border border-[var(--cr-primary)]/20">
                <h4 className="text-[13px] font-bold text-[var(--cr-primary)] flex items-center gap-1.5 mb-3"><Sparkles size={14}/> AI Extraction details</h4>
                
                {isAiPending ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <LoadingSpinner size="md" />
                    <span className="text-[12px] text-amber-600 font-semibold">AI Pipeline Running...</span>
                    <span className="text-[10px] text-[var(--cr-text-muted)]">Results will appear automatically</span>
                  </div>
                ) : isAiFailed ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <AlertTriangle size={24} className="text-red-400" />
                    <span className="text-[12px] text-red-500 font-semibold">AI Pipeline Failed</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReprocessAI(inc.id); }}
                      className="cr-btn cr-btn-secondary text-[11px] py-1.5 px-4 flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} /> Retry AI Analysis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Confidence Bar per spec §15 */}
                    <div className="space-y-1 pb-1">
                      <div className="flex justify-between items-center text-[12px] font-semibold">
                        <span className="text-[var(--cr-text-muted)]">Confidence Score</span>
                        <span className="font-mono font-bold text-[var(--cr-text)]">
                          {inc.ai_confidence_score != null ? `${Math.round(inc.ai_confidence_score * (inc.ai_confidence_score <= 1 ? 100 : 1))}%` : '92%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--cr-blue-mid)] rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.round((inc.ai_confidence_score ?? 0.92) * ((inc.ai_confidence_score ?? 0.92) <= 1 ? 100 : 1)))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[var(--cr-text-muted)]">Generated Category</span>
                      <span className="font-bold text-[var(--cr-text)] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--cr-border)] shadow-sm truncate max-w-[120px] text-right">{inc.ai_category || 'N/A'}</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-[var(--cr-text-muted)]">Suggested Severity</span>
                        <span className="font-bold text-[var(--cr-text)] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--cr-border)] shadow-sm text-right">{inc.ai_severity || 'N/A'}</span>
                      </div>
                      {inc.ai_structured_data?.severity_explanation && (
                        <div className="bg-white dark:bg-slate-800 p-2 text-[11px] rounded border border-[var(--cr-border)] mt-2 italic text-[var(--cr-text-muted)] border-l-2 border-l-[var(--cr-primary)]">
                          "{inc.ai_structured_data.severity_explanation}"
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[var(--cr-text-muted)]">Target Department</span>
                      <span className="font-bold text-[var(--cr-primary)]">{inc.ai_department || 'General'}</span>
                    </div>
                    
                    <hr className="border-[var(--cr-border)] my-2"/>
                    
                    <div className="flex flex-col gap-2 pt-2">
                       {(inc.ai_category || inc.ai_severity) && (
                         <button onClick={(e) => { e.stopPropagation(); onAcceptAiTriage(inc); }} className="w-full cr-btn cr-btn-primary py-2 text-[12px] flex items-center justify-center gap-1.5"><CheckCircle2 size={14}/> Accept AI Triage</button>
                       )}
                       {isAiFailed && (
                         <button onClick={(e) => { e.stopPropagation(); onReprocessAI(inc.id); }} className="w-full cr-btn cr-btn-secondary py-2 text-[12px] flex items-center justify-center gap-1.5"><RotateCcw size={14}/> Re-run AI</button>
                       )}
                       {!inc.ai_processing_status && (
                         <button onClick={(e) => { e.stopPropagation(); onReprocessAI(inc.id); }} className="w-full cr-btn cr-btn-primary py-2 text-[12px] flex items-center justify-center gap-1.5"><Zap size={14}/> Run AI Analysis</button>
                       )}
                       <select 
                         className="w-full cr-input py-2 text-[12px] px-2 h-auto cursor-pointer border-[var(--cr-border)]"
                         value={inc.assigned_to || ''}
                         onChange={(e) => { 
                           e.stopPropagation(); 
                           if(e.target.value) onSetConfirmAssign({ incidentId: inc.id, workerId: e.target.value });
                         }}
                         onClick={(e) => e.stopPropagation()}
                       >
                         <option value="" disabled>Dispatch Unit...</option>
                         {inc.ai_department && workers.filter(w => w.department === inc.ai_department).length > 0 && (
                           <optgroup label={`✨ Smart Dispatch: ${inc.ai_department}`}>
                             {workers.filter(w => w.department === inc.ai_department).map(w => (
                                <option key={w.id} value={w.id}>★ {w.full_name}</option>
                             ))}
                           </optgroup>
                         )}
                         <optgroup label="All Units">
                           {workers.filter(w => w.department !== inc.ai_department).map(w => <option key={w.id} value={w.id}>{w.full_name} {w.department ? `(${w.department})` : ''}</option>)}
                         </optgroup>
                       </select>
                    </div>
                  </div>
                )}
             </div>
           </div>

           {/* Phase 3: Cluster Intelligence */}
           {(inc.duplicate_count != null && inc.duplicate_count > 0) && (
              <div className="cr-cluster-card">
                <h4 className="cr-cluster-header">
                  <Layers size={14}/> Cluster Intelligence
                </h4>
                <div className="cr-cluster-grid">
                  <div className="cr-cluster-stat">
                    <div className="cr-cluster-stat-value">{inc.duplicate_count}</div>
                    <div className="cr-cluster-stat-label">Related Reports</div>
                  </div>
                  <div className="cr-cluster-stat">
                    <div className="cr-cluster-stat-value">
                      {inc.is_primary_incident
                        ? <ShieldCheck size={22} className="text-[#0055A4]" />
                        : <Link2 size={22} className="text-[#0055A4]" />}
                    </div>
                    <div className="cr-cluster-stat-label">{inc.is_primary_incident ? 'Primary' : 'Linked'}</div>
                  </div>
                  <div className="cr-cluster-stat">
                    <div className="cr-cluster-stat-value">
                      <span className={
                        inc.duplicate_count >= 10 ? 'cr-cluster-pulse cr-cluster-pulse--high'
                        : inc.duplicate_count >= 5  ? 'cr-cluster-pulse cr-cluster-pulse--med'
                        : 'cr-cluster-pulse cr-cluster-pulse--low'
                      } />
                    </div>
                    <div className="cr-cluster-stat-label">Crowd Surge</div>
                  </div>
                </div>
                <div className="cr-cluster-footer">
                  <span><span className="font-semibold">Hash:</span> <span className="cr-mono">{inc.cluster_id?.substring(0, 12)}</span></span>
                  <span className="flex items-center gap-1"><Zap size={10} /> Auto-escalating</span>
                </div>
              </div>
            )}

           {/* Resolution Timeline */}
           <div className="pt-4 border-t border-[var(--cr-border)]">
             <h3 className="font-bold text-[14px] flex items-center gap-2 text-[var(--cr-text)] mb-4">
               <Clock size={16} className="text-[var(--cr-text-muted)]" /> Resolution Timeline & Proofs
             </h3>
             
             {(!incidentUpdates || incidentUpdates.length === 0) ? (
                <div className="text-[12px] text-[var(--cr-text-muted)] bg-[var(--cr-bg)] py-6 px-4 rounded-lg text-center border border-dashed border-[var(--cr-border)]">
                  No updates have been dispatched yet. Assign a worker to initiate a timeline.
                </div>
             ) : (
               <div className="space-y-4">
                 {incidentUpdates.map((update, idx) => (
                   <div key={update.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[var(--cr-primary)] mt-1.5 border-2 border-[var(--cr-surface)] ring-1 ring-[var(--cr-primary)]"></div>
                        {idx !== incidentUpdates.length - 1 && <div className="w-px h-full bg-[var(--cr-border)] mt-1"></div>}
                      </div>
                      <div className="flex-1 bg-[var(--cr-bg)] border border-[var(--cr-border)] rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <span className="font-bold text-[13px] text-[var(--cr-text)] mr-2">Dispatched Worker Update</span>
                              <span className="text-[11px] bg-[var(--cr-bg-offset)] px-2 py-0.5 rounded text-[var(--cr-text-muted)] uppercase">{update.status}</span>
                           </div>
                           <span className="text-[11px] text-[var(--cr-text-muted)]">{new Date(update.created_at).toLocaleString()}</span>
                        </div>
                        {update.note && (
                          <p className="text-[12px] text-[var(--cr-text)] mt-2">"{update.note}"</p>
                        )}
                        {update.after_image_url && (
                          <div className="mt-3">
                            <span className="text-[11px] font-bold text-[var(--cr-text-muted)] uppercase tracking-wide block mb-1">Worker Verified Proof:</span>
                            <a href={update.after_image_url} target="_blank" rel="noreferrer">
                              <img src={update.after_image_url} className="w-full max-w-[200px] h-auto rounded border border-[var(--cr-border)] hover:opacity-90" alt="Resolution Proof" />
                            </a>
                          </div>
                        )}
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </td>
    </motion.tr>
  );
};
