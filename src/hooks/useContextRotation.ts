import { useState, useEffect, useCallback } from 'react';

export type ContextId = 'global' | 'mideast' | 'ukraine' | 'domestic' | 'intel';

export interface RotationContext {
  id: ContextId;
  icon: string;
  label: string;
  briefFocus: string | undefined;
}

export const CONTEXTS: RotationContext[] = [
  { id: 'global',   icon: '🌍', label: 'GLOBAL',   briefFocus: undefined },
  { id: 'mideast',  icon: '🕌', label: 'MIDEAST',  briefFocus: 'mideast' },
  { id: 'ukraine',  icon: '⚔️', label: 'UKRAINE',  briefFocus: 'ukraine' },
  { id: 'domestic', icon: '🇺🇸', label: 'DOMESTIC', briefFocus: 'domestic' },
  { id: 'intel',    icon: '🕵️', label: 'INTEL',    briefFocus: 'intel' },
];

const ROTATE_INTERVAL = 3 * 60 * 1000; // 3 minutes

export function useContextRotation(autoRotate = true) {
  const [contextIndex, setContextIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const context = CONTEXTS[contextIndex];

  const next = useCallback(() => {
    setContextIndex(i => (i + 1) % CONTEXTS.length);
    setProgress(0);
  }, []);

  const prev = useCallback(() => {
    setContextIndex(i => (i - 1 + CONTEXTS.length) % CONTEXTS.length);
    setProgress(0);
  }, []);

  const goTo = useCallback((idx: number) => {
    setContextIndex(idx % CONTEXTS.length);
    setProgress(0);
  }, []);

  // Auto-rotate timer — progress is CSS-driven, JS only handles the switch
  useEffect(() => {
    if (!autoRotate || paused) return;

    // Kick CSS transition: 0 → 100 over ROTATE_INTERVAL
    // Start at 0, then rAF to 100 so the browser sees the change
    setProgress(0);
    const raf = requestAnimationFrame(() => setProgress(100));

    const timer = setTimeout(() => {
      next();
    }, ROTATE_INTERVAL);

    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [contextIndex, autoRotate, paused, next]);

  return { context, contextIndex, progress, paused, setPaused, next, prev, goTo };
}
