import { useState, useEffect } from 'react';
import { formatTime } from '../utils/formatters';

interface ClockZone {
  label: string;
  time: string;
}

const ZONE_DEFS: { label: string; tz: string }[] = [
  { label: 'BUE', tz: 'America/Argentina/Buenos_Aires' },
  { label: 'DC', tz: 'America/New_York' },
  { label: 'UTC', tz: 'UTC' },
  { label: 'LON', tz: 'Europe/London' },
  { label: 'MSK', tz: 'Europe/Moscow' },
  { label: 'BEI', tz: 'Asia/Shanghai' },
  { label: 'TEH', tz: 'Asia/Tehran' },
];

function formatHHMM(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function useClock() {
  const [utc, setUtc] = useState('');
  const [buenosAires, setBuenosAires] = useState('');
  const [zones, setZones] = useState<ClockZone[]>([]);

  useEffect(() => {
    function update() {
      const now = new Date();
      setUtc(formatTime(now, 'UTC'));
      setBuenosAires(formatTime(now, 'America/Argentina/Buenos_Aires'));
      setZones(ZONE_DEFS.map(z => ({ label: z.label, time: formatHHMM(now, z.tz) })));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return { utc, buenosAires, zones };
}
