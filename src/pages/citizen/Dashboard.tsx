import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { PlusCircle, MapPin, AlertCircle, FileText, Activity, CheckCircle, Map as MapIcon, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { Incident, ApiResponse } from '../../types';
import { useTranslation } from '../../lib/useTranslation';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { HeatmapLayer } from '../../components/shared/HeatmapLayer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { IncidentDetailModal } from '../../components/shared/IncidentDetailModal';

// Fix leaflet marker icon issue in React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function CitizenDashboard() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<{id: string, title?: string} | null>(null);
  const { t } = useTranslation();

  // Find center for map (default to first incident with location)
  const mapCenterStr = incidents.find(i => i.location_lat && i.location_lng);
  const defaultCenter = mapCenterStr 
    ? [mapCenterStr.location_lat!, mapCenterStr.location_lng!] as [number, number]
    : [28.6139, 77.2090] as [number, number]; // New Delhi default

  // Build heatmap data points: [lat, lng, intensity]
  const heatPoints: [number, number, number][] = incidents
    .filter(i => i.location_lat && i.location_lng)
    .map(i => [
      i.location_lat!,
      i.location_lng!,
      // Intensity based on severity and cluster size
      (i.severity === 'critical' ? 1.0 : i.severity === 'high' ? 0.8 : i.severity === 'medium' ? 0.5 : 0.3)
        * (1 + (i.duplicate_count || 0) * 0.15) // Boost clustered incidents
    ]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth('/api/v1/incidents');
        const json: ApiResponse<Incident[]> = await res.json();
        if (res.ok && json.success && json.data) {
          setIncidents(json.data);
        } else {
          setError(json.detail || json.message || "Failed to load incidents");
        }
      } catch (err) {
        console.error('Failed to load incidents', err);
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalReports = incidents.length;
  const inProgress = incidents.filter(i => ['pending', 'in-progress'].includes(i.status)).length;
  const resolved = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header section — Premium UX4G Grid Style */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="space-y-1">
          <Badge variant="outline" className="mb-2 uppercase tracking-wider text-[10px] font-bold text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
            {t('citizen.badge')}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('citizen.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {t('citizen.welcome')} <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.full_name?.split(' ')[0] || t('auth.roleCitizen')}</span>{t('citizen.welcomeSuffix')}
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button asChild className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
            <NavLink to="/citizen/report">
              <PlusCircle size={18} className="mr-2" />
              <span className="font-semibold">{t('citizen.submitIncident')}</span>
            </NavLink>
          </Button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 font-medium text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IncidentDetailModal 
        incidentId={selectedIncident?.id || null} 
        title={selectedIncident?.title} 
        onClose={() => setSelectedIncident(null)} 
      />

      {loading ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
          <Skeleton className="lg:w-[340px] h-[350px] rounded-xl hidden lg:block" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Content Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Quick Stats - Premium UX4G Grid */}
            <div className="grid grid-cols-3 gap-5">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                <Card className="border-t-4 border-t-blue-500 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                  <CardContent className="p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <FileText size={16} /> <span className="text-[11px] font-bold uppercase tracking-widest">{t('citizen.total')}</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{totalReports}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
                <Card className="border-t-4 border-t-orange-500 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                  <CardContent className="p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <Activity size={16} /> <span className="text-[11px] font-bold uppercase tracking-widest">{t('citizen.active')}</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{inProgress}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
                <Card className="border-t-4 border-t-emerald-500 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                  <CardContent className="p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <CheckCircle size={16} /> <span className="text-[11px] font-bold uppercase tracking-widest">{t('citizen.resolved')}</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{resolved}</div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* List */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Activity size={18} className="text-blue-500" /> 
                  {t('citizen.incidentFeed')}
                </h2>
              </div>
              
              {incidents.length === 0 ? (
                <EmptyState
                  title={t('citizen.emptyTitle')}
                  description={t('citizen.emptyDesc')}
                  action={<Button asChild className="mt-4"><NavLink to="/citizen/report"><MapPin size={16} className="mr-2" /> {t('citizen.scanNeighborhood')}</NavLink></Button>}
                />
              ) : (
                <motion.div className="flex flex-col gap-3" variants={containerVariants} initial="hidden" animate="visible">
                  {incidents.map((inc) => (
                    <motion.div key={inc.id} variants={cardVariants}>
                      <Card 
                        className="group cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-colors shadow-sm hover:shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur"
                        onClick={() => setSelectedIncident({ id: inc.id, title: inc.title })}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-3 mb-2">
                              <StatusBadge status={inc.status} />
                              <Badge variant="secondary" className="font-mono text-[10px] tracking-tight text-slate-500 bg-slate-100 dark:bg-slate-800/50">
                                {inc.tracking_id}
                              </Badge>
                              {inc.ai_category && (
                                <Badge className="ml-auto text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/40">
                                  AI {inc.ai_category}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-[15px] truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {inc.title}
                            </h3>
                            <div className="text-[13px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-1.5 font-medium">
                              <MapPin size={13} className="text-slate-400" /> {inc.address || t('citizen.unknownAddress')}
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: AI & Geography context */}
          <div className="lg:w-[350px] flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-6"
            >
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                  <CardTitle className="text-[14px] flex items-center gap-2">
                    <MapIcon size={18} className="text-blue-600 dark:text-blue-400" />
                    Community Map
                  </CardTitle>
                </CardHeader>
                <div className="h-[300px] relative flex shadow-inner border-b border-slate-100 dark:border-slate-800/60 bg-blue-50 dark:bg-slate-950">
                  <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={false} className="w-full h-full z-0">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {/* Heatmap overlay */}
                    {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}
                    {incidents.filter(i => i.location_lat && i.location_lng).map(inc => (
                      <Marker key={inc.id} position={[inc.location_lat!, inc.location_lng!]}>
                        <Popup>
                          <div className="font-sans font-medium text-slate-800 py-1">
                            <h4 className="font-bold text-[13px] leading-tight mb-1">{inc.title}</h4>
                            <StatusBadge status={inc.status} />
                            {inc.duplicate_count && inc.duplicate_count > 0 && (
                              <p className="text-[11px] text-orange-600 font-bold mt-1">🔥 {inc.duplicate_count} related reports</p>
                            )}
                            <div className="mt-2 text-[11px] text-blue-600 underline cursor-pointer" onClick={() => setSelectedIncident({ id: inc.id, title: inc.title })}>View Details</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
                <CardContent className="p-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                      🌡️ Heatmap showing {heatPoints.length} incident hotspots
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">Live</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
        </div>
      )}
    </div>
  );
}
