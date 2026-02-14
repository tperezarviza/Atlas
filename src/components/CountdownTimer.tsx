import { useState, useEffect, useMemo } from 'react';
import type { EconomicEvent } from '../types';

interface CountdownTimerProps {
  events: EconomicEvent[];
}

function parseEventDate(evt: EconomicEvent): Date | null {
  // Try to parse "Feb 12" + "8:30am" into a Date
  const year = new Date().getFullYear();
  const dateStr = `${evt.date} ${year} ${evt.time}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

export default function CountdownTimer({ events }: CountdownTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextEvent = useMemo(() => {
    const highImpact = events.filter(e => e.impact === 'high');
    let closest: { evt: EconomicEvent; date: Date } | null = null;
    for (const evt of highImpact) {
      const d = parseEventDate(evt);
      if (!d || d.getTime() <= now) continue;
      if (!closest || d.getTime() < closest.date.getTime()) {
        closest = { evt, date: d };
      }
    }
    return closest;
  }, [events, now]);

  if (!nextEvent) return null;

  const diff = nextEvent.date.getTime() - now;
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  return (
    <div
      className="px-[10px] py-2 flex items-center gap-2"
      style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,59,59,.04)' }}
    >
      <span className="text-[10px]">{'\u23F1\uFE0F'}</span>
      <span className="font-data text-[9px] text-text-muted">NEXT HIGH-IMPACT:</span>
      <span className="font-data text-[10px] text-text-primary font-medium truncate">{nextEvent.evt.event_name}</span>
      <span className="font-data text-[11px] text-critical font-bold ml-auto">{hours}h {minutes}m</span>
    </div>
  );
}
