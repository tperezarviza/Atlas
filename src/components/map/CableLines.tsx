import { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import type { GeoJSONCollection } from '../../services/api';

interface CableLinesProps {
  data: GeoJSONCollection | null;
  visible: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#4a90d9',
  under_construction: '#d9a84a',
  planned: '#7a6418',
};

export default function CableLines({ data, visible }: CableLinesProps) {
  const lines = useMemo(() => {
    if (!visible || !data?.features) return null;
    return data.features.map((f, i) => {
      const coords = (f.geometry.coordinates as number[][]).map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const p = f.properties;
      const color = STATUS_COLORS[p.status as string] ?? '#4a90d9';
      return (
        <Polyline
          key={`cable-${i}`}
          positions={coords}
          pathOptions={{
            color,
            weight: 1.5,
            opacity: 0.6,
            dashArray: '6 4',
          }}
        >
          <Tooltip sticky className="map-tooltip">
            <div className="tt-title">{p.name as string}</div>
            <div className="tt-meta">
              {p.operator as string} · {p.capacity_tbps as number} Tbps · {p.year_deployed as number}
            </div>
            <div className="tt-headline" style={{ color: color }}>
              {(p.status as string).replace(/_/g, ' ').toUpperCase()}
            </div>
          </Tooltip>
        </Polyline>
      );
    });
  }, [data, visible]);

  return <>{lines}</>;
}
