import { useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { getSensitiveDateEvents } from '../utils/sensitiveDateEvents';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { CalendarEvent, EconomicEvent } from '../types';

const urgencyBorder: Record<string, string> = {
  today: '#ff3b3b',
  soon: '#ff8c00',
  future: '#ffc832',
};

const impactBorder: Record<string, string> = {
  high: '#ff3b3b',
  medium: '#ff8c00',
  low: '#ffc832',
};

interface UnifiedEvent {
  id: string;
  type: 'diplomatic' | 'economic';
  date: string;
  title: string;
  detail: string;
  borderColor: string;
  sortKey: number;
}

interface IntelMonitorProps {
  filter?: (event: UnifiedEvent) => boolean;
  title?: string;
}

export default function IntelMonitor({ filter, title }: IntelMonitorProps = {}) {
  const { data: calData, loading: calLoading, error: calError, lastUpdate: calLast } =
    useApiData<CalendarEvent[]>(api.calendar, 3_600_000);
  const { data: econData, loading: econLoading, error: econError, lastUpdate: econLast } =
    useApiData<EconomicEvent[]>(api.economicCalendar, 3_600_000);

  const unifiedEvents = useMemo(() => {
    const events: UnifiedEvent[] = [];

    // Diplomatic events
    const calendarEvents = calData ?? [];
    const sensitive = getSensitiveDateEvents();
    const allDiplomatic = [...sensitive, ...calendarEvents];
    const urgencyOrder: Record<string, number> = { today: 0, soon: 1, future: 2 };

    for (const ev of allDiplomatic) {
      events.push({
        id: `dip-${ev.id}`,
        type: 'diplomatic',
        date: ev.date,
        title: ev.title,
        detail: ev.detail,
        borderColor: urgencyBorder[ev.urgency] ?? '#ffc832',
        sortKey: urgencyOrder[ev.urgency] ?? 2,
      });
    }

    // Economic events
    if (econData) {
      for (const ev of econData) {
        events.push({
          id: `econ-${ev.event_name}-${ev.date}`,
          type: 'economic',
          date: `${ev.date} ${ev.time}`,
          title: `${ev.currency} — ${ev.event_name}`,
          detail: [
            ev.actual ? `Actual: ${ev.actual}` : null,
            ev.forecast ? `Forecast: ${ev.forecast}` : null,
            ev.previous ? `Previous: ${ev.previous}` : null,
          ].filter(Boolean).join(' · '),
          borderColor: impactBorder[ev.impact] ?? '#ffc832',
          sortKey: ev.impact === 'high' ? 0 : ev.impact === 'medium' ? 1 : 2,
        });
      }
    }

    const sorted = events.sort((a, b) => a.sortKey - b.sortKey);
    return filter ? sorted.filter(filter) : sorted;
  }, [calData, econData, filter]);

  const isLoading = (calLoading && !calData) || (econLoading && !econData);
  const hasError = (calError && !calData) || (econError && !econData);
  const badgeData = calData || econData;
  const badgeError = calError || econError;
  const badgeLoading = calLoading || econLoading;
  const badgeLast = calLast || econLast;

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(255,200,50,0.025)', border: '1px solid rgba(255,200,50,0.10)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          {title ? `🔍 ${title}` : '🔍 Intel Monitor'}
        </div>
        <DataBadge data={badgeData} error={badgeError} loading={badgeLoading} lastUpdate={badgeLast} intervalMs={3_600_000} liveLabel="Live" mockLabel="Mock" />
      </div>

      {/* Error message */}
      {hasError && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load intel data. Retrying...
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? <Skeleton lines={5} /> : unifiedEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <span className="font-data text-[10px] text-text-muted tracking-[0.5px]">No matching events</span>
          </div>
        ) : (
          unifiedEvents.map(event => (
            <div
              key={event.id}
              className="transition-colors duration-150 hover:bg-bg-card-hover"
              style={{
                borderBottom: '1px solid rgba(255,200,50,0.10)',
                borderLeft: `3px solid ${event.borderColor}`,
                padding: '10px 18px 10px 14px',
              }}
            >
              <div className="flex items-center gap-[8px]" style={{ marginBottom: 6 }}>
                <span className="font-data text-[9px] text-accent font-semibold tracking-[0.5px]">
                  {event.date}
                </span>
                <span
                  className="font-data text-[7px] px-[3px] py-[0.5px] rounded-[2px] uppercase"
                  style={{
                    background: event.type === 'diplomatic' ? 'rgba(255,200,50,.12)' : 'rgba(212,167,44,.1)',
                    color: event.type === 'diplomatic' ? '#ffc832' : '#d4a72c',
                    border: `1px solid ${event.type === 'diplomatic' ? 'rgba(255,200,50,.28)' : 'rgba(212,167,44,.2)'}`,
                  }}
                >
                  {event.type === 'diplomatic' ? 'DIPLO' : 'ECON'}
                </span>
              </div>
              <div className="text-[11px] text-text-primary font-medium leading-[1.45]" style={{ marginBottom: 4 }}>
                {event.title}
              </div>
              <div className="font-data text-[9px] text-text-muted">
                {event.detail}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
