import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, MapPin, Zap, AlertTriangle } from 'lucide-react';
import type { Incident } from '../../../types';
import { SlaBadge } from './SlaBadge';
import { SeverityBadge } from '../../../components/shared/SeverityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { calculateSlaStatus } from '../../../lib/sla';

// Fix leaflet marker icon issue in React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dynamic map recentering on filter / center changes
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Custom colored SVG pin generator based on SLA and severity
function createCustomPin(color: string, isBreached: boolean) {
  const pulseClass = isBreached ? 'animate-bounce' : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" class="${pulseClass}">
      <path fill="${color}" stroke="#FFFFFF" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3.5" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-pin-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

interface TerritoryMapViewProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onSwitchToWorkspace: (id: string) => void;
}

export const TerritoryMapView: React.FC<TerritoryMapViewProps> = ({
  incidents,
  onSelectIncident,
  onSwitchToWorkspace,
}) => {
  // Filter incidents that have coordinates
  const geoIncidents = useMemo(() => {
    return incidents.filter(i => {
      const lat = Number(i.location_lat || (i as unknown as { latitude?: number }).latitude);
      const lng = Number(i.location_lng || (i as unknown as { longitude?: number }).longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [incidents]);

  const nonGeoCount = incidents.length - geoIncidents.length;

  // Center point computation (default to average of coordinates or central Delhi / Mumbai)
  const center = useMemo<[number, number]>(() => {
    if (geoIncidents.length === 0) return [28.6139, 77.2090]; // Default New Delhi
    const sumLat = geoIncidents.reduce((acc, i) => acc + Number(i.location_lat || (i as unknown as { latitude?: number }).latitude), 0);
    const sumLng = geoIncidents.reduce((acc, i) => acc + Number(i.location_lng || (i as unknown as { longitude?: number }).longitude), 0);
    return [sumLat / geoIncidents.length, sumLng / geoIncidents.length];
  }, [geoIncidents]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Map Header Status Bar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-blue-600" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Territory GIS Map View ({geoIncidents.length} geocoded)
          </span>
          {nonGeoCount > 0 && (
            <span className="text-[11px] text-slate-400">
              ({nonGeoCount} without coordinates in Table/Workspace)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
            <span className="text-slate-500 text-[11px]">SLA Breached / Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-500 text-[11px]">Expiring Soon / High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
            <span className="text-slate-500 text-[11px]">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span className="text-slate-500 text-[11px]">Resolved</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[460px] sm:h-[550px] lg:h-[650px] w-full relative z-0">
        {geoIncidents.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 shadow-md flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={15} />
            <span>No incidents in current filter have GPS coordinates. View them in Table or Workspace.</span>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapRecenter center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geoIncidents.map((inc) => {
            const lat = Number(inc.location_lat || (inc as unknown as { latitude?: number }).latitude);
            const lng = Number(inc.location_lng || (inc as unknown as { longitude?: number }).longitude);
            const sla = calculateSlaStatus(inc.created_at, inc.category, inc.severity, inc.status);

            // Color coding
            let pinColor = '#2563EB'; // Blue
            if (inc.status === 'resolved') {
              pinColor = '#10B981'; // Green
            } else if (sla.status === 'breached' || inc.severity === 'critical') {
              pinColor = '#DC2626'; // Red
            } else if (sla.status === 'expiring' || inc.severity === 'high') {
              pinColor = '#F59E0B'; // Amber
            }

            const pinIcon = createCustomPin(pinColor, sla.status === 'breached');

            return (
              <Marker
                key={inc.id}
                position={[lat, lng]}
                icon={pinIcon}
                eventHandlers={{
                  click: () => onSelectIncident(inc.id),
                }}
              >
                <Popup className="custom-incident-popup">
                  <div className="p-1 max-w-xs space-y-2">
                    {/* Thumbnail if available */}
                    {inc.image_url && (
                      <div className="w-full h-28 rounded overflow-hidden mb-1">
                        <img src={inc.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {inc.tracking_id || inc.id.slice(0, 8)}
                      </span>
                      <SlaBadge
                        createdAt={inc.created_at}
                        category={inc.category}
                        severity={inc.severity}
                        status={inc.status}
                      />
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {inc.title || inc.generated_title || 'Reported Incident'}
                    </h4>

                    <div className="flex items-center gap-1 flex-wrap">
                      <SeverityBadge severity={inc.severity} />
                      <StatusBadge status={inc.status} />
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {inc.description || 'No description provided.'}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => onSwitchToWorkspace(inc.id)}
                        className="w-full py-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Zap size={12} /> Inspect in Workspace
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
