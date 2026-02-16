import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import type { FireHotspot } from '../../types';

interface FireMarkersProps {
  data: FireHotspot[] | null;
  visible: boolean;
}

export default function FireMarkers({ data, visible }: FireMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    // Filter: only high confidence (≥ 80)
    const filtered = data.filter(f => f.confidence >= 80);
    return filtered.map((fire, i) => (
      <CircleMarker
        key={`fire-${i}-${fire.latitude}-${fire.longitude}`}
        center={[fire.latitude, fire.longitude]}
        radius={3}
        pathOptions={{
          color: '#ff8c00',
          fillColor: fire.frp > 50 ? '#ff3b3b' : '#ff8c00',
          fillOpacity: 0.6,
          weight: 0.5,
          opacity: 0.7,
        }}
      >
        <Tooltip direction="top" offset={[0, -4]} className="map-tooltip">
          <div className="tt-title">Fire Hotspot</div>
          <div className="tt-meta">
            {fire.satellite} · {fire.acq_date} · {fire.daynight === 'D' ? 'Day' : 'Night'}
          </div>
          <div className="tt-headline">
            Brightness: {fire.brightness.toFixed(1)}K · FRP: {fire.frp.toFixed(1)} MW · Conf: {fire.confidence}%
          </div>
        </Tooltip>
      </CircleMarker>
    ));
  }, [data, visible]);

  return <>{markers}</>;
}
