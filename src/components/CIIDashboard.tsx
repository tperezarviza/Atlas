import { memo, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';

const REFRESH_MS = 120_000;

interface CIIEntry {
  code: string;
  name: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  sparkline: number[];
  factors: Record<string, number>;
}

// Programmatic flag emoji from ISO 3166-1 alpha-2 code
function codeToFlag(code: string): string {
  if (code.length !== 2) return '🏳️';
  const offset = 0x1F1E6 - 65; // Regional Indicator Symbol Letter A
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
}

const REGION_CODES: Record<string, Set<string>> = {
  mideast: new Set(['IR', 'IQ', 'SY', 'YE', 'LB', 'IL', 'PS', 'SA', 'EG', 'TR']),
  ukraine: new Set(['UA', 'RU']),
  domestic: new Set([]),
  intel: new Set([]),
};

function scoreColor(s: number): string {
  if (s >= 70) return '#ff3b3b';
  if (s >= 50) return '#ff8c00';
  if (s >= 30) return '#ffc832';
  return '#00ff88';
}

function scoreLabel(s: number): string {
  if (s >= 70) return 'CRIT';
  if (s >= 50) return 'HIGH';
  if (s >= 30) return 'MOD';
  return 'LOW';
}

function trendArrow(t: string): { symbol: string; color: string } {
  if (t === 'rising') return { symbol: '↑', color: '#ff3b3b' };
  if (t === 'falling') return { symbol: '↓', color: '#00ff88' };
  return { symbol: '→', color: '#7a6418' };
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const bars = data.slice(-24);
  return (
    <div className="flex items-end gap-px" style={{ height: 16 }}>
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            width: 2,
            height: Math.max(1, (v / max) * 16),
            background: scoreColor(v),
            opacity: 0.7,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

interface CIIDashboardProps {
  contextId?: string;
}

export default memo(function CIIDashboard({ contextId }: CIIDashboardProps) {
  const { data, loading, error, lastUpdate } = useApiData<CIIEntry[]>(api.cii, REFRESH_MS);

  const highlightCodes = contextId ? REGION_CODES[contextId] ?? new Set() : new Set();

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.score - a.score);
  }, [data]);

  if (loading && !data) return <Skeleton lines={8} />;

  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 'var(--text-panel-header)', color: '#ffc832', letterSpacing: 2 }}
                className="font-title font-bold uppercase tracking-widest">
            INSTABILITY INDEX
          </span>
          <DataBadge data={sorted.length > 0 ? sorted : null} error={error} lastUpdate={lastUpdate} />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        {sorted.map((entry) => {
          const flag = codeToFlag(entry.code);
          const trend = trendArrow(entry.trend);
          const isHighlighted = highlightCodes.size > 0 && highlightCodes.has(entry.code);

          return (
            <div
              key={entry.code}
              className="flex items-center gap-2 px-3 py-[6px] transition-colors duration-150"
              style={{
                borderBottom: '1px solid rgba(255,200,50,0.04)',
                background: isHighlighted ? 'rgba(255,200,50,0.06)' : 'transparent',
                borderLeft: isHighlighted ? '2px solid #ffc832' : '2px solid transparent',
              }}
            >
              {/* Flag + Name */}
              <span style={{ fontSize: 14 }}>{flag}</span>
              <span
                className="font-body truncate"
                style={{
                  fontSize: 'var(--text-body)',
                  color: isHighlighted ? '#ffe082' : '#c8a020',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {entry.name}
              </span>

              {/* Sparkline */}
              <MiniSparkline data={entry.sparkline} />

              {/* Trend */}
              <span className="font-data font-bold" style={{ fontSize: 13, color: trend.color }}>
                {trend.symbol}
              </span>

              {/* Score + Label */}
              <span
                className="font-data font-bold text-right"
                style={{
                  fontSize: 'var(--text-mono)',
                  color: scoreColor(entry.score),
                  minWidth: 64,
                }}
              >
                {Math.round(entry.score)}{' '}
                <span style={{ fontSize: 9, opacity: 0.7, letterSpacing: 0.5 }}>{scoreLabel(entry.score)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
