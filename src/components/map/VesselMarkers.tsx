import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Vessel } from '../../types';

interface VesselMarkersProps {
  data: Vessel[] | null;
  visible: boolean;
  zoomLevel: number;
}

const VESSEL_COLORS: Record<string, string> = {
  tanker: '#ff8c00',
  cargo: '#ffc832',
  container: '#00ff88',
  military: '#ff3b3b',
  other: '#7a6418',
};

function bucketHeading(heading: number): number {
  return Math.round(heading / 45) * 45 % 360;
}

const iconCache = new Map<string, L.DivIcon>();
function getVesselIcon(heading: number, type: string): L.DivIcon {
  const bucket = bucketHeading(heading);
  const color = VESSEL_COLORS[type] ?? VESSEL_COLORS.other;
  const key = `v-${bucket}-${color}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<svg viewBox="0 0 16 16" width="12" height="12" style="transform:rotate(${bucket}deg)"><polygon points="8,1 14,14 2,14" fill="${color}" opacity="0.85"/></svg>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

export default function VesselMarkers({ data, visible, zoomLevel }: VesselMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || zoomLevel <= 8 || !data) return null;
    return data.map(v => (
      <Marker
        key={v.id}
        position={[v.lat, v.lng]}
        icon={getVesselIcon(v.heading, v.type)}
        zIndexOffset={590}
      >
        <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
          <div className="tt-title">{v.name}</div>
          <div className="tt-meta">{v.type.toUpperCase()} · {v.flag}</div>
          <div className="tt-headline">
            SPD: {v.speed_knots}kn · HDG: {Math.round(v.heading)}°
            {v.destination ? ` · → ${v.destination}` : ''}
            {v.near_chokepoint ? ` · ${v.near_chokepoint}` : ''}
          </div>
        </Tooltip>
      </Marker>
    ));
  }, [data, visible, zoomLevel]);

  return <>{markers}</>;
}
