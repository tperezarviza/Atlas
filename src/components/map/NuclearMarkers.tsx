import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { nuclearFacilities } from '../../data/nuclearFacilities';
import type { NuclearFacility } from '../../types';

interface NuclearMarkersProps {
  visible: boolean;
}

const iconCache = new Map<string, L.DivIcon>();
function getNuclearIcon(status: string): L.DivIcon {
  let icon = iconCache.get(status);
  if (!icon) {
    const color = status === 'active' || status === 'under_construction' ? '#d4a72c' : '#64748b';
    const pulse = status === 'active' ? 'animation:pulse 2s infinite;' : '';
    icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:12px;filter:drop-shadow(0 0 3px ${color});${pulse}">☢</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    iconCache.set(status, icon);
  }
  return icon;
}

function dedup(facilities: { lat: number; lng: number; id: string }[], threshold = 0.3): Set<string> {
  const skip = new Set<string>();
  for (let i = 0; i < facilities.length; i++) {
    for (let j = i + 1; j < facilities.length; j++) {
      const dlat = Math.abs(facilities[i].lat - facilities[j].lat);
      const dlng = Math.abs(facilities[i].lng - facilities[j].lng);
      if (dlat < threshold && dlng < threshold) {
        skip.add(facilities[j].id);
      }
    }
  }
  return skip;
}

export default function NuclearMarkers({ visible }: NuclearMarkersProps) {
  const markers = useMemo(() => {
    if (!visible) return null;

    const skipIds = dedup(nuclearFacilities);
    const filtered = nuclearFacilities.filter(f => !skipIds.has(f.id));

    return filtered.map(fac => (
      <Marker
        key={fac.id}
        position={[fac.lat, fac.lng]}
        icon={getNuclearIcon(fac.status)}
        zIndexOffset={580}
      >
        <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
          <div className="tt-title">☢ {fac.name}</div>
          <div className="tt-meta">{fac.country} · {fac.type.toUpperCase()}</div>
          <div className="tt-headline">Status: {fac.status.replace('_', ' ').toUpperCase()}</div>
        </Tooltip>
      </Marker>
    ));
  }, [visible]);

  return <>{markers}</>;
}
