import { mockCalendar } from '../data/mockCalendar';

const urgencyBorder: Record<string, string> = {
  today: '#e83b3b',
  soon: '#e8842b',
  future: '#2d7aed',
};

export default function DiplomaticCalendar() {
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
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto">
        {mockCalendar.map((event) => (
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
