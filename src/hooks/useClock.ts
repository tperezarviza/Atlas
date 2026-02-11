import { useState, useEffect } from 'react';
import { formatTime } from '../utils/formatters';

export function useClock() {
  const [utc, setUtc] = useState('');
  const [buenosAires, setBuenosAires] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      setUtc(formatTime(now, 'UTC'));
      setBuenosAires(formatTime(now, 'America/Argentina/Buenos_Aires'));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return { utc, buenosAires };
}
