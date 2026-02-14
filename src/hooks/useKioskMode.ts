import { useEffect } from 'react';

const RELOAD_INTERVAL_MS = 30 * 60 * 1000; // 30 min

export function useKioskMode(active: boolean) {
  useEffect(() => {
    if (!active) return;

    document.documentElement.classList.add('kiosk');

    document.documentElement.requestFullscreen?.().catch(() => {});

    let wakeLock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then(wl => { wakeLock = wl; }).catch(() => {});

    const reloadTimer = setInterval(() => {
      window.location.reload();
    }, RELOAD_INTERVAL_MS);

    return () => {
      document.documentElement.classList.remove('kiosk');
      wakeLock?.release().catch(() => {});
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      clearInterval(reloadTimer);
    };
  }, [active]);
}
