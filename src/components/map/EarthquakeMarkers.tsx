import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import type { Earthquake } from '../../types';

interface EarthquakeMarkersProps {
  data: Earthquake[] | null;
  visible: boolean;
}

function quakeColor(alert: string | null): string {
  if (alert === 'red') return '#ff3b3b';
  if (alert === 'orange') return '#ff8c00';
  if (alert === 'yellow') return '#d4a72c';
  return '#ffc832';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function EarthquakeMarkers({ data, visible }: EarthquakeMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data.map(quake => {
      const color = quakeColor(quake.alert);
      const radius = Math.max(4, quake.magnitude * 2);
      return (
        <CircleMarker
          key={quake.id}
          center={[quake.lat, quake.lng]}
          radius={radius}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 1.5,
            opacity: 0.8,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="map-tooltip">
            <div className="tt-title">M{quake.magnitude.toFixed(1)} Earthquake</div>
            <div className="tt-meta">
              {quake.place}
              {quake.tsunami && ' · TSUNAMI WARNING'}
            </div>
            <div className="tt-headline">
              Depth: {quake.depth.toFixed(1)} km · {formatTime(quake.time)}
              {quake.alert && (
                <> · Alert: <span style={{ color, fontWeight: 'bold' }}>{quake.alert.toUpperCase()}</span></>
              )}
            </div>
          </Tooltip>
        </CircleMarker>
      );
    });
  }, [data, visible]);

  return <>{markers}</>;
}
