import type { SessionRegion, SessionStatus, MarketSession } from '../types.js';

interface SessionSchedule {
  region: SessionRegion;
  label: string;
  timezone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  preMarketMinutes: number;
  afterHoursMinutes: number;
  tradingDays: number[]; // 0=Sun..6=Sat
}

const SCHEDULES: SessionSchedule[] = [
  { region: 'americas', label: 'Americas', timezone: 'America/New_York', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, preMarketMinutes: 240, afterHoursMinutes: 240, tradingDays: [1, 2, 3, 4, 5] },
  { region: 'europe', label: 'Europe', timezone: 'Europe/London', openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30, preMarketMinutes: 60, afterHoursMinutes: 60, tradingDays: [1, 2, 3, 4, 5] },
  { region: 'asia_pacific', label: 'Asia-Pacific', timezone: 'Asia/Tokyo', openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0, preMarketMinutes: 60, afterHoursMinutes: 30, tradingDays: [1, 2, 3, 4, 5] },
  { region: 'middle_east_africa', label: 'Middle East/Africa', timezone: 'Asia/Riyadh', openHour: 10, openMinute: 0, closeHour: 15, closeMinute: 0, preMarketMinutes: 30, afterHoursMinutes: 30, tradingDays: [0, 1, 2, 3, 4] },
];

function getLocalTime(timezone: string): { hour: number; minute: number; dayOfWeek: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short',
  }).formatToParts(now);

  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  const dayStr = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, minute, dayOfWeek: dayMap[dayStr] ?? 1 };
}

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function formatCountdown(diffMinutes: number): string {
  if (diffMinutes < 1) return 'now';
  const h = Math.floor(diffMinutes / 60);
  const m = Math.round(diffMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getSessionStatus(sched: SessionSchedule): { status: SessionStatus; nextEvent: string } {
  const local = getLocalTime(sched.timezone);
  const now = toMinutes(local.hour, local.minute);
  const open = toMinutes(sched.openHour, sched.openMinute);
  const close = toMinutes(sched.closeHour, sched.closeMinute);
  const isTradingDay = sched.tradingDays.includes(local.dayOfWeek);

  if (!isTradingDay) {
    // Find next trading day
    let daysUntil = 1;
    for (let d = 1; d <= 7; d++) {
      const nextDay = (local.dayOfWeek + d) % 7;
      if (sched.tradingDays.includes(nextDay)) { daysUntil = d; break; }
    }
    const minsUntilOpen = (daysUntil - 1) * 1440 + (1440 - now) + open;
    return { status: 'closed', nextEvent: `Opens in ${formatCountdown(minsUntilOpen)}` };
  }

  if (now >= open && now < close) {
    return { status: 'open', nextEvent: `Closes in ${formatCountdown(close - now)}` };
  }

  if (now >= open - sched.preMarketMinutes && now < open) {
    return { status: 'pre_market', nextEvent: `Opens in ${formatCountdown(open - now)}` };
  }

  if (now >= close && now < close + sched.afterHoursMinutes) {
    // Find next trading day
    let daysUntil = 1;
    for (let d = 1; d <= 7; d++) {
      const nextDay = (local.dayOfWeek + d) % 7;
      if (sched.tradingDays.includes(nextDay)) { daysUntil = d; break; }
    }
    const minsUntilOpen = (daysUntil - 1) * 1440 + (1440 - now) + open;
    return { status: 'after_hours', nextEvent: `Opens in ${formatCountdown(minsUntilOpen)}` };
  }

  // Before pre-market
  if (now < open - sched.preMarketMinutes) {
    return { status: 'closed', nextEvent: `Pre-market in ${formatCountdown(open - sched.preMarketMinutes - now)}` };
  }

  // After after-hours
  let daysUntil = 1;
  for (let d = 1; d <= 7; d++) {
    const nextDay = (local.dayOfWeek + d) % 7;
    if (sched.tradingDays.includes(nextDay)) { daysUntil = d; break; }
  }
  const minsUntilOpen = (daysUntil - 1) * 1440 + (1440 - now) + open;
  return { status: 'closed', nextEvent: `Opens in ${formatCountdown(minsUntilOpen)}` };
}

export function getMarketSessions(): MarketSession[] {
  return SCHEDULES.map((sched) => {
    const { status, nextEvent } = getSessionStatus(sched);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      region: sched.region,
      label: sched.label,
      status,
      opensAt: `${pad(sched.openHour)}:${pad(sched.openMinute)}`,
      closesAt: `${pad(sched.closeHour)}:${pad(sched.closeMinute)}`,
      nextEvent,
    };
  });
}

export function getActiveRegions(): SessionRegion[] {
  return getMarketSessions()
    .filter((s) => s.status === 'open' || s.status === 'pre_market')
    .map((s) => s.region);
}
