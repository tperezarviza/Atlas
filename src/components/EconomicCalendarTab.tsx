import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import CountdownTimer from './CountdownTimer';
import type { EconomicEvent } from '../types';

const IMPACT_BADGE: Record<string, { icon: string; color: string }> = {
  high:   { icon: '\u{1F534}', color: '#ff3b3b' },
  medium: { icon: '\u{1F7E0}', color: '#ff8c00' },
  low:    { icon: '\u{1F7E1}', color: '#d4a72c' },
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}', EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}',
  JPY: '\u{1F1EF}\u{1F1F5}', CNY: '\u{1F1E8}\u{1F1F3}', CHF: '\u{1F1E8}\u{1F1ED}',
  AUD: '\u{1F1E6}\u{1F1FA}', CAD: '\u{1F1E8}\u{1F1E6}', NZD: '\u{1F1F3}\u{1F1FF}',
};

function actualVsForecast(actual?: string, forecast?: string): string | null {
  if (!actual || !forecast) return null;
  const a = parseFloat(actual.replace(/[%K]/g, ''));
  const f = parseFloat(forecast.replace(/[%K]/g, ''));
  if (isNaN(a) || isNaN(f)) return null;
  if (a > f) return '#00ff88';
  if (a < f) return '#ff3b3b';
  return '#d4a72c';
}

interface EconomicCalendarTabProps {
  data: EconomicEvent[] | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
}

export default function EconomicCalendarTab({ data, loading, error, lastUpdate }: EconomicCalendarTabProps) {
  const events = data ?? [];

  return (
    <>
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load economic calendar. Retrying...
        </div>
      )}

      {loading && !data ? (
        <Skeleton lines={5} />
      ) : (
        <>
          {/* Countdown to next high-impact */}
          <CountdownTimer events={events} />

          {events.map((evt, i) => {
            const impact = IMPACT_BADGE[evt.impact] ?? IMPACT_BADGE.low;
            const avfColor = actualVsForecast(evt.actual, evt.forecast);

            return (
              <div
                key={`${evt.date}-${evt.event_name}-${i}`}
                className="px-[10px] py-2"
                style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}
              >
                <div className="flex items-center gap-[6px] mb-[2px]">
                  <span className="text-[10px]">{CURRENCY_FLAGS[evt.currency] ?? '\u{1F4B1}'}</span>
                  <span className="font-data text-[9px] text-accent font-semibold">{evt.currency}</span>
                  <span className="text-[9px]">{impact.icon}</span>
                  <span className="font-data text-[9px] text-text-muted ml-auto">{evt.date} · {evt.time}</span>
                </div>
                <div className="text-[11px] text-text-primary font-medium">{evt.event_name}</div>
                <div className="flex gap-3 mt-[3px] font-data text-[9px]">
                  {evt.forecast && (
                    <span className="text-text-muted">Forecast: <b className="text-text-secondary">{evt.forecast}</b></span>
                  )}
                  {evt.previous && (
                    <span className="text-text-muted">Previous: <b className="text-text-secondary">{evt.previous}</b></span>
                  )}
                  {evt.actual && (
                    <span style={{ color: avfColor ?? '#e0e6f0' }}>Actual: <b>{evt.actual}</b></span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
