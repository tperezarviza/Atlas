import { useRef, useEffect, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { getSensitiveDateEvents } from '../utils/sensitiveDateEvents';
import MaybeFadeIn from './MaybeFadeIn';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { CalendarEvent } from '../types';

const REFRESH_MS = 3_600_000; // 1 hour

const urgencyBorder: Record<string, string> = {
  today: '#ff3b3b',
  soon: '#ff8c00',
  future: '#ffc832',
};

export default function DiplomaticCalendar() {
  const { data, loading, error, lastUpdate } = useApiData<CalendarEvent[]>(api.calendar, REFRESH_MS);
  const baseEvents = data ?? [];
  const events = useMemo(() => {
    const sensitive = getSensitiveDateEvents();
    const order: Record<string, number> = { today: 0, soon: 1, future: 2 };
    return [...sensitive, ...baseEvents].sort((a, b) =>
      (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2)
    );
  }, [baseEvents]);
  const hasShownData = useRef(false);
  useEffect(() => { if (data) hasShownData.current = true; }, [data]);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📅 Diplomatic Calendar
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} liveLabel="Live" mockLabel="Mock" />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load calendar. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <Skeleton lines={5} />
      ) : (
        /* Events */
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {events.map((event) => (
              <div
                key={event.id}
                className="px-[10px] py-2"
                style={{
                  borderBottom: '1px solid rgba(255,200,50,0.10)',
                  borderLeft: `3px solid ${urgencyBorder[event.urgency]}`,
                }}
              >
                <div className="font-data text-[9px] text-accent font-semibold tracking-[0.5px]">
                  {event.date}
                </div>
                <div className="text-[12px] text-text-primary mt-[2px] font-medium">
                  {event.title}
                </div>
                <div className="font-data text-[9px] text-text-muted mt-[2px]">
                  {event.detail}
                </div>
              </div>
            ))}
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
}
