import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { NaturalEvent } from '../../types';

interface NaturalEventMarkersProps {
  data: NaturalEvent[] | null;
  visible: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Volcanoes': '\u{1F30B}',
  'Severe Storms': '\u{1F300}',
  'Wildfires': '\u{1F525}',
  'Floods': '\u{1F30A}',
  'Sea & Lake Ice': '\u2744\uFE0F',
  'Earthquakes': '\u{1F4A5}',
};

const iconCache = new Map<string, L.DivIcon>();
function getEventIcon(category: string, severity: string): L.DivIcon {
  const key = `evt-${category}-${severity}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const emoji = CATEGORY_ICONS[category] ?? '\u26A0\uFE0F';
    const pulse = severity === 'extreme' || severity === 'severe' ? 'animation:pulse 2s infinite;' : '';
    icon = L.divIcon({
      className: '',
      html: `<div style="font-size:16px;text-align:center;filter:drop-shadow(0 0 4px rgba(232,59,59,.6));${pulse}">${emoji}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

export default function NaturalEventMarkers({ data, visible }: NaturalEventMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data.map(evt => (
      <Marker
        key={evt.id}
        position={[evt.lat, evt.lng]}
        icon={getEventIcon(evt.category, evt.severity)}
        zIndexOffset={570}
      >
        <Tooltip direction="top" offset={[0, -8]} className="map-tooltip">
          <div className="tt-title">{evt.title}</div>
          <div className="tt-meta">{evt.category} · {evt.severity.toUpperCase()} · {evt.source}</div>
          <div className="tt-headline">
            {evt.magnitude ? `Magnitude: ${evt.magnitude} · ` : ''}{evt.date.slice(0, 10)}
          </div>
        </Tooltip>
      </Marker>
    ));
  }, [data, visible]);

  return <>{markers}</>;
}
