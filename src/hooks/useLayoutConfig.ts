import { useState, useCallback } from 'react';
import type { SlotId } from '../config/widgetRegistry';
import type { ViewId } from '../types/views';

const STORAGE_KEY = 'atlas-layout-v2';

interface LayoutState {
  collapsed: Record<string, boolean>;
  customSlots: Partial<Record<ViewId, Partial<Record<SlotId, string | null>>>>;
}

function loadState(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { collapsed: {}, customSlots: {} };
}

function saveState(state: LayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useLayoutConfig() {
  const [state, setState] = useState<LayoutState>(loadState);

  const isCollapsed = useCallback((panelKey: string) => {
    return !!state.collapsed[panelKey];
  }, [state.collapsed]);

  const setCollapsed = useCallback((panelKey: string, collapsed: boolean) => {
    setState(prev => {
      const next = {
        ...prev,
        collapsed: { ...prev.collapsed, [panelKey]: collapsed },
      };
      saveState(next);
      return next;
    });
  }, []);

  const getCustomSlots = useCallback((view: ViewId) => {
    return state.customSlots[view];
  }, [state.customSlots]);

  const setCustomSlot = useCallback((view: ViewId, slot: SlotId, widgetId: string | null) => {
    setState(prev => {
      const viewSlots = { ...prev.customSlots[view], [slot]: widgetId };
      const next = {
        ...prev,
        customSlots: { ...prev.customSlots, [view]: viewSlots },
      };
      saveState(next);
      return next;
    });
  }, []);

  const resetCustomSlots = useCallback((view: ViewId) => {
    setState(prev => {
      const { [view]: _, ...rest } = prev.customSlots;
      const next = { ...prev, customSlots: rest };
      saveState(next);
      return next;
    });
  }, []);

  return {
    isCollapsed,
    setCollapsed,
    getCustomSlots,
    setCustomSlot,
    resetCustomSlots,
  };
}
