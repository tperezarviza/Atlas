import { CircleMarker, Tooltip } from 'react-leaflet';
import type { SurgeAlert } from '../../types';

interface SurgeMarkersProps {
  data: SurgeAlert[] | null;
  visible: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  watch: '#ffc832',
  elevated: '#ff8c00',
  critical: '#ff3b3b',
};

const LEVEL_RADIUS: Record<string, number> = {
  watch: 18,
  elevated: 24,
  critical: 32,
};

export default function SurgeMarkers({ data, visible }: SurgeMarkersProps) {
  if (!visible || !data?.length) return null;

  return (
    <>
      {data.map((surge) => {
        const color = LEVEL_COLORS[surge.level] || '#ffc832';
        const radius = LEVEL_RADIUS[surge.level] || 18;

        return (
          <CircleMarker
            key={surge.baseId}
            center={[surge.lat, surge.lng]}
            radius={radius}
            pathOptions={{
              color,
              weight: 2,
              opacity: 0.8,
              fillColor: color,
              fillOpacity: 0.15,
              className: `surge-ring surge-${surge.level}`,
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} className="map-tooltip">
              <div className="tt-title">SURGE: {surge.baseName}</div>
              <div className="tt-meta">
                {surge.level.toUpperCase()} · z-score: {surge.zScore} · {surge.currentCount} aircraft
              </div>
              <div className="tt-headline">
                Baseline: {surge.baselineMean}±{surge.baselineStdDev}
                <br />
                {surge.topCallsigns.join(', ')}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
