import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import DataBadge from '../DataBadge';
import Skeleton from '../Skeleton';
import type { InternetIncident } from '../../types';

const FLAG_MAP: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', RU: '\u{1F1F7}\u{1F1FA}', CN: '\u{1F1E8}\u{1F1F3}', IR: '\u{1F1EE}\u{1F1F7}', MM: '\u{1F1F2}\u{1F1F2}', SY: '\u{1F1F8}\u{1F1FE}',
  SD: '\u{1F1F8}\u{1F1E9}', ET: '\u{1F1EA}\u{1F1F9}', PK: '\u{1F1F5}\u{1F1F0}', IN: '\u{1F1EE}\u{1F1F3}', IQ: '\u{1F1EE}\u{1F1F6}', AF: '\u{1F1E6}\u{1F1EB}',
  BD: '\u{1F1E7}\u{1F1E9}', TR: '\u{1F1F9}\u{1F1F7}', EG: '\u{1F1EA}\u{1F1EC}', KP: '\u{1F1F0}\u{1F1F5}', CU: '\u{1F1E8}\u{1F1FA}', VE: '\u{1F1FB}\u{1F1EA}',
};

function flagForCode(code: string): string {
  return FLAG_MAP[code] ?? '\u{1F3F3}';
}

function durationLabel(start: string, end?: string): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const hours = Math.floor((e - s) / 3_600_000);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function InternetFreedomPanel() {
  const { data, loading, error, lastUpdate } = useApiData<InternetIncident[]>(api.internetIncidents, 900_000);
  const incidents = data ?? [];

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}>
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🌐 Internet Freedom
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={900_000} />
      </div>

      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load incidents. Retrying...
        </div>
      )}

      {loading && !data ? (
        <Skeleton lines={4} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {incidents.length === 0 && (
            <div className="px-3 py-4 text-[10px] text-text-muted font-data text-center">No active incidents</div>
          )}
          {incidents.map(inc => {
            const ongoing = !inc.endDate;
            return (
              <div key={inc.id} className="px-3 py-[10px]" style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px]">{flagForCode(inc.countryCode)}</span>
                  <span className="font-data text-[10px] text-text-primary font-medium">{inc.country}</span>
                  {ongoing && (
                    <span
                      className="font-data text-[7px] px-[4px] py-[1px] rounded-[2px] uppercase font-bold"
                      style={{ background: 'rgba(255,59,59,.15)', color: '#ff3b3b' }}
                    >
                      ONGOING
                    </span>
                  )}
                  <span className="font-data text-[8px] text-text-muted ml-auto">{durationLabel(inc.startDate, inc.endDate)}</span>
                </div>
                <div className="text-[11px] text-text-primary leading-[1.4]">{inc.title}</div>
                <div className="font-data text-[8px] text-text-muted mt-[2px]">{inc.shortDescription}</div>
                <div className="font-data text-[7px] text-accent mt-[2px]">{inc.eventType}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
