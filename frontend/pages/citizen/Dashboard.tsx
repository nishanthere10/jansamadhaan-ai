import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fetchWithAuth } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SeverityBadge } from '../../components/shared/SeverityBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { CopyTrackingId } from '../../components/shared/CopyTrackingId';
import {
  PlusCircle,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  Map as MapIcon,
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
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
import { KpiSkeleton, IncidentRowSkeleton } from '../../components/ui/skeleton';
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
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

function getGreeting(name?: string) {
  const hour = new Date().getHours();
  let timeStr = 'Good morning';
  if (hour >= 12 && hour < 17) timeStr = 'Good afternoon';
  else if (hour >= 17) timeStr = 'Good evening';

  const firstName = name?.split(' ')[0];
  return firstName ? `${timeStr}, ${firstName}` : timeStr;
}

export default function CitizenDashboard() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<{ id: string; title?: string } | null>(null);
  const { t } = useTranslation();

  // Find center for map (default to first incident with location)
  const mapCenterStr = incidents.find((i) => i.location_lat && i.location_lng);
  const defaultCenter = mapCenterStr
    ? ([mapCenterStr.location_lat!, mapCenterStr.location_lng!] as [number, number])
    : ([28.6139, 77.209] as [number, number]);

  // Build heatmap points: [lat, lng, intensity]
  const heatPoints: [number, number, number][] = incidents
    .filter((i) => i.location_lat && i.location_lng)
    .map((i) => [
      i.location_lat!,
      i.location_lng!,
      (i.severity === 'critical' ? 1.0 : i.severity === 'high' ? 0.8 : i.severity === 'medium' ? 0.5 : 0.3) *
        (1 + (i.duplicate_count || 0) * 0.15),
    ]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/v1/incidents');
      const json: ApiResponse<Incident[]> = await res.json();
      if (res.ok && json.success && json.data) {
        setIncidents(json.data);
      } else {
        setError(json.detail || json.message || 'Failed to load your complaints');
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
      setError('Could not connect to the municipal server. Please check your network and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalReports = incidents.length;
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;
  const activeCount = incidents.filter((i) => ['assigned', 'in-progress'].includes(i.status)).length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* ── TOP GREETING & PRIMARY CITIZEN CTA ── */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pt-4 pb-6 border-b border-slate-200 dark:border-slate-800"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <Badge
            variant="outline"
            className="mb-2 uppercase tracking-wider text-[10px] font-bold text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
          >
            Citizen Service Portal
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {getGreeting(user?.full_name)}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Here is the live status and progress of your reported community issues.
          </p>
        </div>

        {/* Dominant Citizen Action: Orange CTA */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0 w-full sm:w-auto">
          <Button asChild variant="citizen" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 font-bold justify-center">
            <NavLink to="/citizen/report">
              <PlusCircle size={18} className="mr-2" />
              <span>Report New Incident</span>
            </NavLink>
          </Button>
        </motion.div>
      </motion.div>

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incidentId={selectedIncident?.id || null}
        title={selectedIncident?.title}
        onClose={() => setSelectedIncident(null)}
        onStatusChange={load}
      />

      {/* ── ERROR STATE WITH RETRY ── */}
      {error && !loading && (
        <div className="mb-6">
          <ErrorState
            title="Unable to load your reports"
            description={error}
            onRetry={load}
          />
        </div>
      )}

      {/* ── LOADING SKELETON PASS ── */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <IncidentRowSkeleton />
              <IncidentRowSkeleton />
              <IncidentRowSkeleton />
            </div>
            <div className="lg:w-[350px] h-[340px] rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse hidden lg:block" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── REASSURANCE STATS ROW ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending / Under Review */}
            <Card className="border-t-4 border-t-amber-500 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-500" /> Under Review / Pending
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {pendingCount}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold text-sm">
                  {totalReports > 0 ? `${Math.round((pendingCount / totalReports) * 100)}%` : '0%'}
                </div>
              </CardContent>
            </Card>

            {/* Active / In Progress */}
            <Card className="border-t-4 border-t-blue-500 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-500" /> Active in Field
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {activeCount}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {totalReports > 0 ? `${Math.round((activeCount / totalReports) * 100)}%` : '0%'}
                </div>
              </CardContent>
            </Card>

            {/* Resolved */}
            <Card className="border-t-4 border-t-emerald-500 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Resolved & Closed
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {resolvedCount}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  {totalReports > 0 ? `${Math.round((resolvedCount / totalReports) * 100)}%` : '0%'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── TWO COLUMN MAIN AREA ── */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Your Reports List */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-[var(--cr-authority)]" />
                  Your Reported Issues ({totalReports})
                </h2>
              </div>

              {incidents.length === 0 ? (
                <EmptyState
                  title="No complaints filed yet"
                  description="You haven't reported any civic issues in your neighborhood. Spot a pothole, broken streetlight, or garbage pile? Report it now for prompt municipal resolution."
                  action={
                    <Button asChild variant="citizen" className="mt-4 font-semibold">
                      <NavLink to="/citizen/report">
                        <PlusCircle size={16} className="mr-1.5" /> Report Your First Issue
                      </NavLink>
                    </Button>
                  }
                />
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {incidents.map((inc) => {
                    const formattedDate = inc.created_at
                      ? new Date(inc.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recently';

                    return (
                      <motion.div key={inc.id} variants={cardVariants}>
                        <Card
                          className="group cursor-pointer border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all bg-white dark:bg-slate-900"
                          onClick={() => setSelectedIncident({ id: inc.id, title: inc.title })}
                        >
                          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Top row badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={inc.status} />
                                <SeverityBadge severity={inc.severity} />
                                <div onClick={(e) => e.stopPropagation()}>
                                  <CopyTrackingId trackingId={inc.tracking_id} />
                                </div>
                                {inc.ai_category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 dark:bg-slate-800"
                                  >
                                    {inc.ai_category}
                                  </Badge>
                                )}
                              </div>

                              {/* Title */}
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                {inc.title}
                              </h3>

                              {/* Meta: location + date */}
                              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5 truncate max-w-sm">
                                  <MapPin size={13} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{inc.address || 'Location registered via GPS'}</span>
                                </span>
                                <span className="flex items-center gap-1 shrink-0 text-slate-400">
                                  <Calendar size={12} />
                                  <span>{formattedDate}</span>
                                </span>
                              </div>
                            </div>

                            {/* Chevron right */}
                            <div className="shrink-0 p-2 rounded-lg group-hover:bg-slate-100 dark:group-hover:bg-slate-800 text-slate-400 group-hover:text-blue-600 transition-colors">
                              <ChevronRight size={20} />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Right: Community Map & Hotspots */}
            <div className="lg:w-[360px] shrink-0 space-y-6">
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapIcon size={16} className="text-[var(--cr-authority)]" />
                      Community Incident Map
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-mono">
                      Live
                    </span>
                  </CardTitle>
                </CardHeader>

                <div className="h-[280px] relative w-full bg-slate-100 dark:bg-slate-950">
                  <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="w-full h-full z-0"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}
                    {incidents
                      .filter((i) => i.location_lat && i.location_lng)
                      .map((inc) => (
                        <Marker key={inc.id} position={[inc.location_lat!, inc.location_lng!]}>
                          <Popup>
                            <div className="text-xs space-y-1 font-sans">
                              <p className="font-bold text-slate-900">{inc.title}</p>
                              <p className="text-slate-500">{inc.address}</p>
                              <button
                                type="button"
                                className="text-blue-600 font-semibold underline mt-1 block"
                                onClick={() => setSelectedIncident({ id: inc.id, title: inc.title })}
                              >
                                View full details →
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>

                <CardContent className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center justify-between">
                  <span>{heatPoints.length} geotagged issues</span>
                  <span className="text-[11px] text-slate-400">Updates in real-time</span>
                </CardContent>
              </Card>

              {/* Citizen Trust Banner */}
              <Card className="p-4 border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <ShieldCheck size={16} className="text-[var(--cr-authority)]" />
                  <span>Jan Samadhan Citizen Assurance</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Every issue reported through Jan Samadhan receives an immutable public tracking receipt. Status transitions are verified with field photo evidence before closure.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
