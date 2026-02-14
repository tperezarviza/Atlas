import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { armedGroupLocations } from '../../data/armedGroupLocations';
import type { ArmedGroup, ArmedGroupType } from '../../types';

interface ArmedGroupMarkersProps {
  data: ArmedGroup[] | null;
  visible: boolean;
}

const TYPE_COLORS: Record<ArmedGroupType, string> = {
  jihadist: '#ff3b3b',
  militia: '#ff8c00',
  cartel: '#a855f7',
  separatist: '#d4a72c',
  insurgent: '#d4a72c',
  state_proxy: '#ffc832',
};

const iconCache = new Map<string, L.DivIcon>();
function getGroupIcon(type: ArmedGroupType): L.DivIcon {
  let icon = iconCache.get(type);
  if (!icon) {
    const color = TYPE_COLORS[type] ?? '#ff3b3b';
    icon = L.divIcon({
      className: '',
      html: `<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="${color}"/><line x1="12" y1="2" x2="12" y2="8" stroke="${color}" stroke-width="1.5"/><line x1="12" y1="16" x2="12" y2="22" stroke="${color}" stroke-width="1.5"/><line x1="2" y1="12" x2="8" y2="12" stroke="${color}" stroke-width="1.5"/><line x1="16" y1="12" x2="22" y2="12" stroke="${color}" stroke-width="1.5"/></svg>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    iconCache.set(type, icon);
  }
  return icon;
}

export default function ArmedGroupMarkers({ data, visible }: ArmedGroupMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data
      .map(group => {
        const coords = armedGroupLocations[group.id];
        if (!coords) return null;
        return (
          <Marker
            key={group.id}
            position={coords}
            icon={getGroupIcon(group.type)}
            zIndexOffset={560}
          >
            <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
              <div className="tt-title">{group.name}</div>
              <div className="tt-meta">
                {group.type.toUpperCase()} · {group.ideology}
              </div>
              <div className="tt-headline">
                Strength: {group.estimatedStrength}<br />
                Regions: {group.countries.join(', ')}
              </div>
            </Tooltip>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [data, visible]);

  return <>{markers}</>;
}
