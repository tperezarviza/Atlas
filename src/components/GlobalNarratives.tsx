import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { PropagandaEntry, HostilityPair } from '../types';

function toneColor(tone: number): string {
  if (tone < -3) return '#ff3b3b';
  if (tone > 1) return '#00ff88';
  return '#d4a72c';
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', RU: '🇷🇺', CN: '🇨🇳', IR: '🇮🇷', IL: '🇮🇱', UA: '🇺🇦',
  SA: '🇸🇦', TR: '🇹🇷', KP: '🇰🇵', IN: '🇮🇳', PK: '🇵🇰', GB: '🇬🇧',
  FR: '🇫🇷', DE: '🇩🇪', SY: '🇸🇾', IQ: '🇮🇶', YE: '🇾🇪', LB: '🇱🇧',
  EG: '🇪🇬', JO: '🇯🇴', PS: '🇵🇸', KR: '🇰🇷', JP: '🇯🇵', TW: '🇹🇼',
};

function flagForCode(code: string): string {
  return FLAG_MAP[code] ?? '🏳';
}

export default function GlobalNarratives() {
  const { data: propData, loading: propLoading, error: propError, lastUpdate: propLast } =
    useApiData<PropagandaEntry[]>(api.propaganda, 3_600_000);
  const { data: hostData, loading: hostLoading, error: hostError, lastUpdate: hostLast } =
    useApiData<HostilityPair[]>(api.hostility, 3_600_000);

  const isLoading = (propLoading && !propData) && (hostLoading && !hostData);
  const badgeData = propData || hostData;
  const badgeError = propError || hostError;
  const badgeLoading = propLoading || hostLoading;
  const badgeLast = propLast || hostLast;

  const sortedPropaganda = propData
    ? [...propData].sort((a, b) => Math.abs(b.toneAvg) - Math.abs(a.toneAvg))
    : null;

  const sortedHostility = hostData
    ? [...hostData].sort((a, b) => a.avgTone - b.avgTone)
    : null;

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(255,200,50,0.025)', border: '1px solid rgba(255,200,50,0.10)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🌐 Global Narratives
        </div>
        <DataBadge data={badgeData} error={badgeError} loading={badgeLoading} lastUpdate={badgeLast} intervalMs={3_600_000} liveLabel="Live" mockLabel="Mock" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? <Skeleton lines={5} /> : (
          <>
            {/* State Media Narratives */}
            <div
              style={{ borderBottom: '1px solid rgba(255,200,50,0.06)', padding: '5px 18px' }}
            >
              <span className="font-data text-[8px] tracking-[1.2px] text-text-muted uppercase">
                📺 State Media Narratives
              </span>
            </div>

            {sortedPropaganda == null ? (
              <div className="px-3 py-4 text-[10px] text-text-muted font-data text-center">No propaganda data available</div>
            ) : (
              sortedPropaganda.map(entry => (
                <div
                  key={entry.id}
                  className="transition-colors duration-150 hover:bg-bg-card-hover"
                  style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', padding: '8px 18px', marginBottom: 0 }}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <span className="text-[11px]">{flagForCode(entry.countryCode)}</span>
                    <span className="font-data text-[10px] text-text-primary font-medium truncate">{entry.outlet}</span>
                    <span className="font-data text-[8px] text-text-muted ml-auto">{entry.articleCount} articles</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ marginTop: 5 }}>
                    <div className="flex-1 h-[4px] rounded-full" style={{ background: 'rgba(255,200,50,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.abs(entry.toneAvg) * 10)}%`,
                          background: toneColor(entry.toneAvg),
                        }}
                      />
                    </div>
                    <span className="font-data text-[9px] font-semibold" style={{ color: toneColor(entry.toneAvg) }}>
                      {entry.toneAvg > 0 ? '+' : ''}{entry.toneAvg.toFixed(1)}
                    </span>
                  </div>
                  {entry.narratives[0] && (
                    <div className="font-data text-[8px] text-text-muted mt-[2px] truncate">
                      {entry.narratives[0]}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Bilateral Tensions */}
            <div
              style={{ borderBottom: '1px solid rgba(255,200,50,0.06)', padding: '5px 18px', marginTop: 4 }}
            >
              <span className="font-data text-[8px] tracking-[1.2px] text-text-muted uppercase">
                ⚡ Bilateral Tensions
              </span>
            </div>

            {sortedHostility == null ? (
              <div className="px-3 py-4 text-[10px] text-text-muted font-data text-center">No hostility data available</div>
            ) : (
              sortedHostility.map(pair => (
                <div
                  key={pair.id}
                  className="transition-colors duration-150 hover:bg-bg-card-hover"
                  style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', padding: '8px 18px' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">{flagForCode(pair.codeA)}</span>
                    <span className="font-data text-[9px] text-text-muted">→</span>
                    <span className="text-[11px]">{flagForCode(pair.codeB)}</span>
                    <span className="font-data text-[9px] font-semibold" style={{ color: pair.avgTone < -3 ? '#ff3b3b' : '#d4a72c' }}>
                      {pair.avgTone.toFixed(1)}
                    </span>
                    <span className="font-data text-[8px] text-text-muted ml-auto">{pair.articleCount} articles</span>
                  </div>
                  <div className="flex items-center gap-2 mt-[3px]">
                    <div className="flex-1 h-[4px] rounded-full" style={{ background: 'rgba(255,200,50,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.abs(pair.avgTone) * 10)}%`,
                          background: pair.avgTone < -3 ? '#ff3b3b' : '#d4a72c',
                        }}
                      />
                    </div>
                    <span
                      className="font-data text-[7px] px-[3px] py-[0.5px] rounded-[2px] uppercase"
                      style={{
                        background: pair.trend === 'critical' ? 'rgba(255,59,59,.12)' : 'rgba(255,140,0,.12)',
                        color: pair.trend === 'critical' ? '#ff3b3b' : '#ff8c00',
                      }}
                    >
                      {pair.trend}
                    </span>
                  </div>
                  {pair.topHeadlines[0] && (
                    <div className="font-data text-[8px] text-text-muted mt-[2px] truncate">
                      {pair.topHeadlines[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
