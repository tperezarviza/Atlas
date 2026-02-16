import { memo, useMemo } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import DataBadge from '../DataBadge';
import Skeleton from '../Skeleton';

const REFRESH_MS = 3_600_000; // 1h

interface MilSpending {
  country: string;
  code: string;
  year: number;
  spendingUsd: number;
  gdpPercent: number;
  rank: number;
  change1yr: number;
}

const NATO_CODES = new Set([
  'US', 'GB', 'FR', 'DE', 'IT', 'CA', 'TR', 'PL', 'GR', 'ES', 'NL', 'BE',
  'NO', 'DK', 'PT', 'RO', 'CZ', 'HU', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV',
  'EE', 'AL', 'ME', 'MK', 'FI', 'SE', 'IS', 'LU',
]);

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', CA: '🇨🇦',
  TR: '🇹🇷', PL: '🇵🇱', GR: '🇬🇷', ES: '🇪🇸', NL: '🇳🇱', BE: '🇧🇪',
  NO: '🇳🇴', DK: '🇩🇰', PT: '🇵🇹', RO: '🇷🇴', CZ: '🇨🇿', HU: '🇭🇺',
  BG: '🇧🇬', HR: '🇭🇷', SK: '🇸🇰', SI: '🇸🇮', LT: '🇱🇹', LV: '🇱🇻',
  EE: '🇪🇪', AL: '🇦🇱', ME: '🇲🇪', MK: '🇲🇰', FI: '🇫🇮', SE: '🇸🇪',
};

const AID_PACKAGES = [
  { name: 'NATO Comprehensive Package', amount: '$43B', year: '2024' },
  { name: 'US FY2025 Supplemental', amount: '$61B', year: '2025' },
  { name: 'EU Military Aid Fund', amount: '€6.1B', year: '2024' },
  { name: 'UK Military Aid', amount: '£4.6B', year: '2024' },
];

const BAR_MAX = 4.5;
const TARGET_PCT = 2.0;
const TARGET_BAR_POSITION = (TARGET_PCT / BAR_MAX) * 100;

export default memo(function NatoResponse() {
  const { data, loading, error, lastUpdate } = useApiData<MilSpending[]>(api.militarySpending, REFRESH_MS);

  const natoMembers = useMemo(() => {
    if (!data) return [];
    // Get latest year for each NATO country, sorted by gdpPercent desc
    const latest = new Map<string, MilSpending>();
    for (const item of data) {
      if (!NATO_CODES.has(item.code)) continue;
      const existing = latest.get(item.code);
      if (!existing || item.year > existing.year) latest.set(item.code, item);
    }
    return [...latest.values()].sort((a, b) => b.gdpPercent - a.gdpPercent);
  }, [data]);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🛡️ NATO Defense Spending
        </div>
        <DataBadge data={natoMembers.length > 0 ? natoMembers : null} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {loading && !data ? <Skeleton lines={10} /> : (
          <div>
            {/* Defense Spending vs 2% Target */}
            <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
              <div className="px-3 py-[6px]">
                <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[8px]">
                  📊 Defense Spending vs 2% GDP Target
                </div>
                <div className="flex flex-col gap-[5px]">
                  {natoMembers.map((member) => {
                    const meetsTarget = member.gdpPercent >= TARGET_PCT;
                    const barColor = meetsTarget ? '#00ff88' : '#ff3b3b';
                    const barWidth = Math.min((member.gdpPercent / BAR_MAX) * 100, 100);

                    return (
                      <div key={member.code}>
                        <div className="flex items-center justify-between mb-[1px]">
                          <div className="flex items-center gap-[5px]">
                            <span className="text-[11px]">{FLAG_MAP[member.code] ?? '🏳️'}</span>
                            <span className="font-data text-[10px] text-text-secondary">
                              {member.country}
                            </span>
                          </div>
                          <div className="flex items-center gap-[6px]">
                            <span className="font-data text-[9px]" style={{ color: member.change1yr > 0 ? '#00ff88' : '#ff3b3b' }}>
                              {member.change1yr > 0 ? '↑' : '↓'}{Math.abs(member.change1yr).toFixed(1)}%
                            </span>
                            <span
                              className="font-data text-[10px] font-semibold"
                              style={{ color: barColor, minWidth: 40, textAlign: 'right' }}
                            >
                              {member.gdpPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {/* Bar with 2% target line */}
                        <div
                          className="h-[5px] rounded-[1px] relative"
                          style={{ background: 'rgba(255,255,255,.04)' }}
                        >
                          <div
                            className="h-full rounded-[1px]"
                            style={{ width: `${barWidth}%`, background: barColor, opacity: 0.8 }}
                          />
                          <div
                            className="absolute top-[-1px] bottom-[-1px] w-[1px]"
                            style={{ left: `${TARGET_BAR_POSITION}%`, borderLeft: '1px dashed rgba(255,255,255,.3)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-[8px] font-data text-[8px] text-text-muted">
                  <div className="flex items-center gap-[4px]">
                    <div className="w-[8px] h-[3px] rounded-[1px]" style={{ background: '#00ff88' }} />
                    <span>Meets 2% target</span>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    <div className="w-[8px] h-[3px] rounded-[1px]" style={{ background: '#ff3b3b' }} />
                    <span>Below 2% target</span>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    <div className="w-[1px] h-[8px]" style={{ borderLeft: '1px dashed rgba(255,255,255,.3)' }} />
                    <span>2% line</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Aid Packages */}
            <div>
              <div className="px-3 py-[6px]">
                <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[6px]">
                  📦 Recent Aid Packages
                </div>
                <div className="flex flex-col gap-[4px]">
                  {AID_PACKAGES.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between px-[6px] py-[5px] rounded-[2px]"
                      style={{ background: 'rgba(255,255,255,.02)' }}
                    >
                      <div className="flex flex-col">
                        <span className="font-data text-[10px] text-text-secondary">{pkg.name}</span>
                        <span className="font-data text-[8px] text-text-muted">{pkg.year}</span>
                      </div>
                      <span className="font-data text-[12px] font-bold text-accent">{pkg.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
