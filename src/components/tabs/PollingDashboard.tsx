import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import type { PollingData } from '../../types';
import DataBadge from '../DataBadge';

const REFRESH_MS = 300_000; // 5 min

const FALLBACK_POLLING: PollingData = {
  presidential_approval: {
    rcp_average: { approve: 47.2, disapprove: 49.8, spread: -2.6 },
    recent_polls: [
      { pollster: 'Rasmussen', date: '2026-02-10', approve: 51, disapprove: 48 },
      { pollster: 'Morning Consult', date: '2026-02-09', approve: 46, disapprove: 51 },
      { pollster: 'Reuters/Ipsos', date: '2026-02-08', approve: 44, disapprove: 52 },
      { pollster: 'Quinnipiac', date: '2026-02-07', approve: 43, disapprove: 53 },
      { pollster: 'Fox News', date: '2026-02-06', approve: 50, disapprove: 47 },
    ],
    trend: 'stable' as const,
  },
  generic_ballot: { rcp_average: { republican: 47.5, democrat: 45.8, spread: 1.7 } },
  direction: { right_direction: 38, wrong_track: 55 },
};

function trendIndicator(trend: string): { symbol: string; color: string } {
  switch (trend) {
    case 'improving': return { symbol: '▲', color: '#00ff88' };
    case 'declining': return { symbol: '▼', color: '#ff3b3b' };
    case 'stable':
    default:          return { symbol: '▬', color: '#d4a72c' };
  }
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">{label}</div>
      <div className="font-data text-[18px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase px-[10px] py-[5px]"
      style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}
    >
      {children}
    </div>
  );
}

export default function PollingDashboard() {
  const { data, loading, error, lastUpdate } = useApiData<PollingData>(api.polling, REFRESH_MS);

  const polling = data ?? FALLBACK_POLLING;
  const { presidential_approval, generic_ballot, direction } = polling;
  const trend = trendIndicator(presidential_approval.trend);
  const spread = presidential_approval.rcp_average.spread;
  const ballotSpread = generic_ballot.rcp_average.spread;

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📊 Polling Dashboard
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load polling data. Retrying...
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* PRESIDENTIAL APPROVAL */}
        <SectionLabel>PRESIDENTIAL APPROVAL</SectionLabel>
        <div className="px-[10px] py-[8px]">
          <div className="flex items-center justify-around">
            <BigStat label="Approve" value={`${presidential_approval.rcp_average.approve}%`} color="#00ff88" />
            <BigStat label="Disapprove" value={`${presidential_approval.rcp_average.disapprove}%`} color="#ff3b3b" />
            <BigStat
              label="Spread"
              value={`${spread > 0 ? '+' : ''}${spread.toFixed(1)}`}
              color={spread >= 0 ? '#00ff88' : '#ff3b3b'}
            />
            <div className="text-center">
              <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">Trend</div>
              <div className="font-data text-[18px] font-bold" style={{ color: trend.color }}>
                {trend.symbol}
              </div>
            </div>
          </div>
        </div>

        {/* GENERIC BALLOT */}
        <SectionLabel>GENERIC BALLOT</SectionLabel>
        <div className="px-[10px] py-[6px]">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">Republican</div>
              <div className="font-data text-[16px] font-bold" style={{ color: '#ffc832' }}>
                {generic_ballot.rcp_average.republican}%
              </div>
            </div>
            <div className="font-data text-[10px] text-text-muted">vs</div>
            <div className="text-center">
              <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">Democrat</div>
              <div className="font-data text-[16px] font-bold" style={{ color: '#ff3b3b' }}>
                {generic_ballot.rcp_average.democrat}%
              </div>
            </div>
          </div>
          <div className="text-center mt-[4px]">
            <span
              className="font-data text-[11px] font-semibold"
              style={{ color: ballotSpread > 0 ? '#ffc832' : '#ff3b3b' }}
            >
              {ballotSpread > 0 ? `R+${ballotSpread.toFixed(1)}` : `D+${Math.abs(ballotSpread).toFixed(1)}`}
            </span>
          </div>
        </div>

        {/* DIRECTION */}
        <SectionLabel>DIRECTION OF COUNTRY</SectionLabel>
        <div className="px-[10px] py-[6px]">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">Right Direction</div>
              <div className="font-data text-[16px] font-bold" style={{ color: '#00ff88' }}>
                {direction.right_direction}%
              </div>
            </div>
            <div className="text-center">
              <div className="font-data text-[8px] tracking-[1px] text-text-muted uppercase mb-[2px]">Wrong Track</div>
              <div className="font-data text-[16px] font-bold" style={{ color: '#ff3b3b' }}>
                {direction.wrong_track}%
              </div>
            </div>
          </div>
        </div>

        {/* RECENT POLLS */}
        <SectionLabel>RECENT POLLS</SectionLabel>
        <div className="pb-[4px]">
          {/* Column headers */}
          <div className="flex items-center px-[10px] py-[3px]">
            <span className="font-data text-[7px] tracking-[1px] text-text-muted uppercase flex-1">Pollster</span>
            <span className="font-data text-[7px] tracking-[1px] text-text-muted uppercase w-[60px] text-right">Date</span>
            <span className="font-data text-[7px] tracking-[1px] text-text-muted uppercase w-[32px] text-right">App</span>
            <span className="font-data text-[7px] tracking-[1px] text-text-muted uppercase w-[32px] text-right">Dis</span>
          </div>
          {presidential_approval.recent_polls.slice(0, 6).map((poll, i) => {
            const pollSpread = poll.approve - poll.disapprove;
            return (
              <div
                key={`${poll.pollster}-${i}`}
                className="flex items-center px-[10px] py-[3px] hover:bg-bg-card-hover transition-colors"
                style={{ borderTop: '1px solid rgba(20,35,63,.5)' }}
              >
                <span className="font-data text-[10px] text-text-secondary flex-1 truncate">
                  {poll.pollster}
                </span>
                <span className="font-data text-[9px] text-text-muted w-[60px] text-right">
                  {poll.date.slice(5)}
                </span>
                <span className="font-data text-[10px] font-medium w-[32px] text-right text-positive">
                  {poll.approve}
                </span>
                <span className="font-data text-[10px] font-medium w-[32px] text-right text-critical">
                  {poll.disapprove}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
