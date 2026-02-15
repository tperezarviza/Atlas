import { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import type { GeoJSONCollection } from '../../services/api';

interface PipelineLinesProps {
  data: GeoJSONCollection | null;
  visible: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  oil: '#d9a84a',
  gas: '#4ad9a8',
  mixed: '#a855f7',
};

const STATUS_DASH: Record<string, string | undefined> = {
  active: undefined,
  damaged: '8 4 2 4',
  proposed: '4 8',
  under_construction: '6 6',
};

const STATUS_LABEL_COLORS: Record<string, string> = {
  active: '#00ff88',
  damaged: '#ff3b3b',
  proposed: '#7a6418',
  under_construction: '#d9a84a',
};

export default function PipelineLines({ data, visible }: PipelineLinesProps) {
  const lines = useMemo(() => {
    if (!visible || !data?.features) return null;
    return data.features.map((f, i) => {
      const coords = (f.geometry.coordinates as number[][]).map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const p = f.properties;
      const pipeType = p.type as string;
      const status = p.status as string;
      const color = status === 'damaged' ? '#ff3b3b' : (TYPE_COLORS[pipeType] ?? '#7a6418');
      return (
        <Polyline
          key={`pipe-${i}`}
          positions={coords}
          pathOptions={{
            color,
            weight: 2,
            opacity: 0.7,
            dashArray: STATUS_DASH[status],
          }}
        >
          <Tooltip sticky className="map-tooltip">
            <div className="tt-title">{p.name as string}</div>
            <div className="tt-meta">
              {p.operator as string} · {pipeType.toUpperCase()} · {(p.year as number) || 'TBD'}
            </div>
            <div className="tt-headline" style={{ color: STATUS_LABEL_COLORS[status] ?? '#7a6418' }}>
              {status.replace(/_/g, ' ').toUpperCase()}
            </div>
          </Tooltip>
        </Polyline>
      );
    });
  }, [data, visible]);

  return <>{lines}</>;
}
