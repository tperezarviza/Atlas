import { memo, useState, useEffect, useCallback } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';

const REFRESH_POLY = 300_000;
const REFRESH_FOCAL = 900_000;
const AUTO_SWITCH_MS = 60_000;

// ── Polymarket types ──
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

// ── Focal Point types ──
interface FocalPoint {
  entity: string;
  entityType: 'country' | 'organization' | 'person' | 'event';
  score: number;
  sources: { type: string; count: number; sample: string }[];
  sourceTypeCount: number;
  trend: 'new' | 'rising' | 'stable' | 'falling';
}

const ENTITY_ICONS: Record<string, string> = {
  country: '🏳️',
  organization: '🏢',
  person: '👤',
  event: '⚡',
};

const TREND_DISPLAY: Record<string, { symbol: string; color: string }> = {
  new: { symbol: '★', color: '#a855f7' },
  rising: { symbol: '↑', color: '#ff3b3b' },
  stable: { symbol: '→', color: '#7a6418' },
  falling: { symbol: '↓', color: '#00ff88' },
};

type Tab = 'predictions' | 'focal';

export default memo(function IntelCenterRight() {
  const [tab, setTab] = useState<Tab>('predictions');

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setTab(prev => prev === 'predictions' ? 'focal' : 'predictions');
    }, AUTO_SWITCH_MS);
    return () => clearInterval(timer);
  }, []);

  const switchTab = useCallback((t: Tab) => setTab(t), []);

  return (
    <div className="h-full flex flex-col">
      {/* Tab header */}
      <div
        className="shrink-0 flex items-center gap-0 px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.08)' }}
      >
        <TabButton
          label="PREDICTIONS"
          active={tab === 'predictions'}
          onClick={() => switchTab('predictions')}
        />
        <TabButton
          label="FOCAL POINTS"
          active={tab === 'focal'}
          onClick={() => switchTab('focal')}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: tab === 'predictions' ? 1 : 0, pointerEvents: tab === 'predictions' ? 'auto' : 'none' }}
        >
          <PredictionsContent />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: tab === 'focal' ? 1 : 0, pointerEvents: tab === 'focal' ? 'auto' : 'none' }}
        >
          <FocalPointsContent />
        </div>
      </div>
    </div>
  );
});

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-title font-bold uppercase tracking-widest cursor-pointer transition-colors duration-150"
      style={{
        fontSize: 'var(--text-panel-header)',
        color: active ? '#ffc832' : '#50400e',
        background: 'transparent',
        border: 'none',
        padding: '0 10px',
        letterSpacing: 2,
        borderBottom: active ? '2px solid #ffc832' : '2px solid transparent',
        paddingBottom: 2,
      }}
    >
      {label}
    </button>
  );
}

// ── Predictions (Polymarket) ──
function PredictionsContent() {
  const { data, loading, error, lastUpdate } = useApiData<PolymarketEvent[]>(api.polymarket, REFRESH_POLY);

  const markets = data
    ? data.filter(m => m.outcomePrices.length > 0).sort((a, b) => b.volume - a.volume).slice(0, 8)
    : [];

  if (loading && !data) return <Skeleton lines={6} />;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex justify-end px-3 py-1">
        <DataBadge data={markets.length > 0 ? markets : null} error={error} lastUpdate={lastUpdate} />
      </div>
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
              style={{ borderBottom: '1px solid rgba(255,200,50,0.04)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="font-data uppercase tracking-wider px-[5px] py-px rounded-sm"
                  style={{ fontSize: 9, color: catColor, background: `${catColor}15`, border: `1px solid ${catColor}30` }}
                >
                  {m.category.replace('_', ' ')}
                </span>
                <span className="font-data" style={{ fontSize: 'var(--text-meta)', color: '#7a6418' }}>
                  VOL {formatVolume(m.volume)}
                </span>
              </div>
              <div
                className="font-body leading-snug mb-1"
                style={{
                  fontSize: 'var(--text-body)', color: '#c8a020',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {m.title}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-data font-bold" style={{ fontSize: 22, color: probColor(topProb) }}>
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
}

// ── Focal Points ──
function FocalPointsContent() {
  const { data, loading, error, lastUpdate } = useApiData<FocalPoint[]>(api.focalPoints, REFRESH_FOCAL);

  const points = data ? [...data].sort((a, b) => b.score - a.score).slice(0, 12) : [];

  if (loading && !data) return <Skeleton lines={6} />;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex justify-end px-3 py-1">
        <DataBadge data={points.length > 0 ? points : null} error={error} lastUpdate={lastUpdate} />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        {points.map((fp) => {
          const icon = ENTITY_ICONS[fp.entityType] ?? '❓';
          const trend = TREND_DISPLAY[fp.trend] ?? TREND_DISPLAY.stable;

          return (
            <div
              key={fp.entity}
              className="px-3 py-[6px] transition-colors duration-150"
              style={{ borderBottom: '1px solid rgba(255,200,50,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span className="font-body truncate" style={{ flex: 1, fontSize: 'var(--text-body)', color: '#c8a020' }}>
                  {fp.entity}
                </span>
                <span className="font-data font-bold" style={{ fontSize: 13, color: trend.color }}>
                  {trend.symbol}
                </span>
                <span
                  className="font-data font-bold text-right"
                  style={{ fontSize: 'var(--text-mono)', color: fp.score >= 5 ? '#ff3b3b' : fp.score >= 3 ? '#ff8c00' : '#ffc832', minWidth: 28 }}
                >
                  {fp.score.toFixed(1)}
                </span>
              </div>
              {/* Source types */}
              <div className="flex flex-wrap gap-1 mt-1 ml-[22px]">
                {fp.sources.slice(0, 4).map((src) => (
                  <span
                    key={src.type}
                    className="font-data uppercase px-[4px] py-px rounded-sm"
                    style={{ fontSize: 9, color: '#7a6418', background: 'rgba(255,200,50,0.06)', border: '1px solid rgba(255,200,50,0.10)' }}
                  >
                    {src.type} ×{src.count}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {points.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full" style={{ color: '#50400e', fontSize: 'var(--text-body)' }}>
            No focal points detected
          </div>
        )}
      </div>
    </div>
  );
}
