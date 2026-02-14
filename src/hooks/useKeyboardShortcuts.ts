import { useEffect } from 'react';
import type { ViewId } from '../types/views';
import { VIEW_PRESETS } from '../types/views';

export function useKeyboardShortcuts(onViewChange: (view: ViewId) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VIEW_PRESETS.length) {
        e.preventDefault();
        onViewChange(VIEW_PRESETS[num - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onViewChange]);
}
