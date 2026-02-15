import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJSONCollection } from '../../services/api';

interface BasesMarkersProps {
  data: GeoJSONCollection | null;
  visible: boolean;
}

const OPERATOR_COLORS: Record<string, string> = {
  US: '#4a90d9',
  RU: '#d94a4a',
  CN: '#d9a84a',
  UK: '#4ad98a',
  FR: '#9b59b6',
  TR: '#e67e22',
  NATO: '#3498db',
  IN: '#1abc9c',
  PK: '#27ae60',
  Other: '#7a6418',
};

const TYPE_ICONS: Record<string, string> = {
  air_base: '✈',
  naval_base: '⚓',
  army_base: '⛺',
  combined: '🏛',
  logistics: '📦',
  hq: '⭐',
};

const iconCache = new Map<string, L.DivIcon>();
function getBaseIcon(operator: string, type: string): L.DivIcon {
  const key = `${operator}-${type}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const color = OPERATOR_COLORS[operator] ?? OPERATOR_COLORS.Other;
    const emoji = TYPE_ICONS[type] ?? '●';
    icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;border-radius:50%;background:${color};border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 6px ${color}80;cursor:pointer">${emoji}</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

export default function BasesMarkers({ data, visible }: BasesMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data?.features) return null;
    return data.features.map((f, i) => {
      const [lng, lat] = f.geometry.coordinates as number[];
      const p = f.properties;
      return (
        <Marker
          key={`base-${i}`}
          position={[lat, lng]}
          icon={getBaseIcon(p.operator as string, p.type as string)}
          zIndexOffset={550}
        >
          <Tooltip direction="top" offset={[0, -10]} className="map-tooltip">
            <div className="tt-title">{p.name as string}</div>
            <div className="tt-meta">
              {(p.operator as string)} · {(p.type as string).replace(/_/g, ' ').toUpperCase()} · {p.country_host as string}
            </div>
          </Tooltip>
        </Marker>
      );
    });
  }, [data, visible]);

  return <>{markers}</>;
}
