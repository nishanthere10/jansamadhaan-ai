import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    gradient?: Record<number, string>;
  };
}

export function HeatmapLayer({ points, options = {} }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const defaultOptions = {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#2563eb',   // blue
        0.4: '#7c3aed',   // violet
        0.6: '#f59e0b',   // amber
        0.8: '#ef4444',   // red
        1.0: '#dc2626',   // dark red
      },
      ...options,
    };

    const heatLayer = L.heatLayer(points, defaultOptions).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, options]);

  return null;
}
