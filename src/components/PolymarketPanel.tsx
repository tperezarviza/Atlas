import { memo, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';

const REFRESH_MS = 300_000;

interface PolymarketEvent {
  id: string;
  title: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  category: string;
}

const CAT_COLORS: Record<string, string> = {
  geopolitical: '#a855f7',
  conflict: '#ff3b3b',
  us_politics: '#1d9bf0',
  economic: '#00ff88',
  other: '#7a6418',
};

function probColor(p: number): string {
  if (p >= 0.65) return '#00ff88';
  if (p >= 0.35) return '#ffc832';
  return '#ff3b3b';
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default memo(function PolymarketPanel() {
  const { data, loading, error, lastUpdate } = useApiData<PolymarketEvent[]>(api.polymarket, REFRESH_MS);

  const markets = useMemo(() => {
    if (!data) return [];
    return data
      .filter(m => m.outcomePrices.length > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [data]);

  if (loading && !data) return <Skeleton rows={6} />;

  return (
    <div className="h-full flex flex-col" style={{ background: 'rgba(255,200,50,0.015)' }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 'var(--text-panel-header)', color: '#ffc832', letterSpacing: 2 }}
                className="font-title font-bold uppercase tracking-widest">
            PREDICTION MARKETS
          </span>
          <DataBadge count={markets.length} label="markets" lastUpdate={lastUpdate} error={error} />
        </div>
      </div>

      {/* Markets list */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        {markets.map((m) => {
          const topProb = Math.max(...m.outcomePrices);
          const topIdx = m.outcomePrices.indexOf(topProb);
          const topOutcome = m.outcomes[topIdx] ?? 'Yes';
          const catColor = CAT_COLORS[m.category] ?? CAT_COLORS.other;

          return (
            <div
              key={m.id}
              className="px-3 py-[8px] transition-colors duration-150"
              style={{
                borderBottom: '1px solid rgba(255,200,50,0.04)',
              }}
            >
              {/* Top row: category tag + volume */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className="font-data uppercase tracking-wider px-[5px] py-px rounded-sm"
                  style={{
                    fontSize: 9,
                    color: catColor,
                    background: `${catColor}15`,
                    border: `1px solid ${catColor}30`,
                  }}
                >
                  {m.category.replace('_', ' ')}
                </span>
                <span className="font-data" style={{ fontSize: 'var(--text-meta)', color: '#7a6418' }}>
                  VOL {formatVolume(m.volume)}
                </span>
              </div>

              {/* Question title */}
              <div
                className="font-body leading-snug mb-1"
                style={{
                  fontSize: 'var(--text-body)',
                  color: '#c8a020',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {m.title}
              </div>

              {/* Probability */}
              <div className="flex items-baseline gap-2">
                <span
                  className="font-data font-bold"
                  style={{ fontSize: 22, color: probColor(topProb) }}
                >
                  {(topProb * 100).toFixed(0)}%
                </span>
                <span className="font-data" style={{ fontSize: 'var(--text-meta)', color: '#7a6418' }}>
                  {topOutcome}
                </span>
              </div>
            </div>
          );
        })}

        {markets.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full" style={{ color: '#50400e', fontSize: 'var(--text-body)' }}>
            No prediction markets available
          </div>
        )}
      </div>
    </div>
  );
});
