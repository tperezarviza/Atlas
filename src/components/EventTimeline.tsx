import { useMemo, useState } from 'react';
import type { Alert } from '../types';

interface EventTimelineProps {
  alerts: Alert[];
}

const DAYS = 7;
const SEVERITY_COLORS: Record<string, string> = {
  flash: '#ff3b3b',
  urgent: '#ff8c00',
  priority: '#d4a72c',
  routine: '#ffc832',
};
const SEVERITY_Y: Record<string, number> = {
  flash: 6,
  urgent: 14,
  priority: 22,
  routine: 30,
};

function dayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function EventTimeline({ alerts }: EventTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { days, buckets } = useMemo(() => {
    const now = new Date();
    const daysArr: Date[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      daysArr.push(d);
    }

    const bucketsMap = new Map<number, Alert[]>();
    daysArr.forEach((_, idx) => bucketsMap.set(idx, []));

    for (const alert of alerts) {
      const alertDate = new Date(alert.timestamp);
      for (let idx = 0; idx < daysArr.length; idx++) {
        if (isSameDay(alertDate, daysArr[idx])) {
          bucketsMap.get(idx)!.push(alert);
          break;
        }
      }
    }

    return { days: daysArr, buckets: bucketsMap };
  }, [alerts]);

  const today = new Date();

  return (
    <div
      className="h-full w-full rounded-[14px] flex items-center relative"
      style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 700 40" preserveAspectRatio="none">
        {days.map((day, idx) => {
          const x = idx * (700 / DAYS);
          const w = 700 / DAYS;
          const isToday = isSameDay(day, today);

          return (
            <g key={idx}>
              {/* Day background */}
              {isToday && (
                <rect x={x} y={0} width={w} height={40} fill="rgba(255,200,50,.04)" />
              )}
              {/* Day separator */}
              {idx > 0 && (
                <line x1={x} y1={0} x2={x} y2={40} stroke="rgba(255,200,50,0.10)" strokeWidth={1} />
              )}
              {/* Day label */}
              <text
                x={x + w / 2}
                y={6}
                textAnchor="middle"
                fill={isToday ? '#ffc832' : '#7a6418'}
                fontSize={5}
                fontFamily="'JetBrains Mono', monospace"
              >
                {dayLabel(day)}
              </text>

              {/* Alert dots */}
              {(buckets.get(idx) ?? []).map((alert, dotIdx) => {
                const dotCount = buckets.get(idx)!.length;
                const spacing = Math.min(12, (w - 10) / Math.max(dotCount, 1));
                const startX = x + w / 2 - (dotCount - 1) * spacing / 2;
                const cx = startX + dotIdx * spacing;
                const cy = SEVERITY_Y[alert.priority] ?? 22;
                const color = SEVERITY_COLORS[alert.priority] ?? '#ffc832';
                const isHovered = hoveredId === alert.id;

                return (
                  <g key={alert.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 4 : 3}
                      fill={color}
                      opacity={isHovered ? 1 : 0.8}
                      style={{ cursor: 'pointer', transition: 'r .1s' }}
                      onMouseEnter={() => setHoveredId(alert.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      {hoveredId && (() => {
        const alert = alerts.find(a => a.id === hoveredId);
        if (!alert) return null;
        return (
          <div
            className="absolute z-10 px-2 py-1 rounded-[3px] font-data text-[9px] pointer-events-none"
            style={{
              background: 'rgba(0,0,0,.95)',
              border: '1px solid rgba(255,200,50,0.10)',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 4,
              whiteSpace: 'nowrap',
            }}
          >
            <div className="text-text-primary font-medium">{alert.title}</div>
            <div className="text-text-muted">
              {alert.source.toUpperCase()} · {new Date(alert.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })()}

      {/* Severity legend */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 font-data text-[7px] text-text-muted"
      >
        {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-[2px]">
            <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: color }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
