import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Chokepoint, ChokepointStatus } from '../../types';

interface ChokepointMarkersProps {
  data: Chokepoint[] | null;
  visible: boolean;
}

const STATUS_COLORS: Record<ChokepointStatus, string> = {
  normal: '#00ff88',
  elevated: '#d4a72c',
  disrupted: '#ff8c00',
  critical: '#ff3b3b',
};

const iconCache = new Map<string, L.DivIcon>();
function getChokepointIcon(status: ChokepointStatus): L.DivIcon {
  let icon = iconCache.get(status);
  if (!icon) {
    const color = STATUS_COLORS[status] ?? '#00ff88';
    icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid ${color};background:rgba(0,0,0,.85);font-size:10px">⚓</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    iconCache.set(status, icon);
  }
  return icon;
}

export default function ChokepointMarkers({ data, visible }: ChokepointMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data.map(cp => (
      <Marker
        key={cp.id}
        position={[cp.lat, cp.lng]}
        icon={getChokepointIcon(cp.status)}
        zIndexOffset={500}
      >
        <Tooltip direction="top" offset={[0, -8]} className="map-tooltip">
          <div className="tt-title">{cp.name}</div>
          <div className="tt-meta">
            Status: <span style={{ color: STATUS_COLORS[cp.status] }}>{cp.status.toUpperCase()}</span>
          </div>
          <div className="tt-headline">
            {cp.dailyVessels.toLocaleString()} vessels/day · {cp.oilFlowMbpd} Mbpd oil · {cp.globalTradePercent}% global trade
          </div>
        </Tooltip>
      </Marker>
    ));
  }, [data, visible]);

  return <>{markers}</>;
}
