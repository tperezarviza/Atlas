import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { HealthResponse } from '../services/api';

const REFRESH_MS = 30_000;

const STATUS_COLORS: Record<string, string> = {
  ok: '#00ff88',
  stale: '#d4a72c',
  empty: '#ff3b3b',
};

export default function ApiHealthPanel() {
  const { data } = useApiData<HealthResponse>(api.health, REFRESH_MS);

  if (!data) return null;

  const grouped = new Map<string, typeof data.services>();
  for (const svc of data.services) {
    const list = grouped.get(svc.category) ?? [];
    list.push(svc);
    grouped.set(svc.category, list);
  }

  const uptimeStr = formatUptime(data.uptime);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          System Health
        </div>
        <div className="font-data text-[9px] text-text-muted">
          {data.summary.ok}/{data.summary.total} OK &middot; Up {uptimeStr}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...grouped.entries()].map(([category, services]) => (
          <div key={category}>
            <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase px-3 pt-2 pb-1">
              {category}
            </div>
            {services.map(svc => (
              <div key={svc.key} className="flex items-center justify-between px-3 py-[3px]">
                <div className="flex items-center gap-[6px]">
                  <div
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: STATUS_COLORS[svc.status] ?? '#7a6418' }}
                  />
                  <span className="font-data text-[10px] text-text-secondary">{svc.name}</span>
                </div>
                <span className="font-data text-[9px] text-text-muted">
                  {svc.ageSeconds !== null ? formatAge(svc.ageSeconds) : '\u2014'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
