import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import type { ConvergenceHotspot } from '../../types';

interface ConvergenceMarkersProps {
  data: ConvergenceHotspot[] | null;
  visible: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  violence: 'Violence',
  protest: 'Protest',
  coercion: 'Coercion',
  demand: 'Political demand',
  crisis_news: 'Crisis news',
  negative_news: 'Negative news',
  news: 'News',
  conflict: 'Armed conflict',
  earthquake: 'Earthquake',
  internet_shutdown: 'Internet shutdown',
  other: 'Other',
};

function hotspotColor(score: number): string {
  if (score >= 60) return '#ff3b3b';
  if (score >= 45) return '#ff8c00';
  return '#ffc832';
}

export default function ConvergenceMarkers({ data, visible }: ConvergenceMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data.map(spot => {
      const color = hotspotColor(spot.score);
      const radius = Math.max(10, Math.min(30, spot.score / 2));
      return (
        <CircleMarker
          key={spot.id}
          center={[spot.lat, spot.lng]}
          radius={radius}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.18,
            weight: 1.5,
            opacity: 0.7,
            className: 'convergence-pulse',
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} className="map-tooltip">
            <div className="tt-title">Convergence Zone</div>
            <div className="tt-meta">
              {spot.eventTypes.length} event types · {spot.totalEvents} events · tone {spot.avgTone}
            </div>
            <div className="tt-headline">
              {spot.eventTypes.map(t => EVENT_LABELS[t] ?? t).join(' · ')}
            </div>
          </Tooltip>
        </CircleMarker>
      );
    });
  }, [data, visible]);

  return <>{markers}</>;
}
