import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api } from '../services/api';
import { mockCalendar } from '../data/mockCalendar';
import DataBadge from './DataBadge';
import type { CalendarEvent } from '../types';

const urgencyBorder: Record<string, string> = {
  today: '#e83b3b',
  soon: '#e8842b',
  future: '#2d7aed',
};

export default function DiplomaticCalendar() {
  const { data, error } = useAutoRefresh<CalendarEvent[]>(api.calendar, 300_000);
  const events = data ?? mockCalendar;

  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📅 Diplomatic Calendar
        </div>
        <DataBadge data={data} error={error} liveLabel="Live" mockLabel="Mock" />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(232,59,59,.04)' }}>
          Failed to load calendar: {error.message}
        </div>
      )}

      {/* Events */}
      <div className="flex-1 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="px-[10px] py-2"
            style={{
              borderBottom: '1px solid #14233f',
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
      </div>
    </div>
  );
}
