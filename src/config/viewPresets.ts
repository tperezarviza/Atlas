import type { LayoutPreset, SlotId } from './widgetRegistry';
import type { ViewId } from '../types/views';

export const VIEW_LAYOUT_PRESETS: Record<ViewId, LayoutPreset> = {
  global: {
    id: 'global',
    label: 'GLOBAL',
    icon: '🌍',
    slots: {
      'r2c1': 'leader-feed',
      'r2c3': 'markets',
      'r3c1': 'newswire',
      'r3c2-left': 'intel-monitor',
      'r3c2-right': 'global-narratives',
      'r3c3': 'ai-brief',
    },
  },
  mideast: {
    id: 'mideast',
    label: 'MIDEAST',
    icon: '🕌',
    slots: {
      'r2c1': 'leader-feed',
      'r2c3': 'markets',
      'r3c1': 'newswire-me',
      'r3c2-left': 'intel-monitor',
      'r3c2-right': 'global-narratives',
      'r3c3': 'ai-brief',
    },
  },
  ukraine: {
    id: 'ukraine',
    label: 'UKRAINE',
    icon: '⚔️',
    slots: {
      'r2c1': 'ukraine-leader',
      'r2c3': 'ukraine-metrics',
      'r3c1': 'newswire-ua',
      'r3c2-left': 'russian-military',
      'r3c2-right': 'nato-response',
      'r3c3': 'ai-brief',
    },
  },
  domestic: {
    id: 'domestic',
    label: 'DOMESTIC',
    icon: '🇺🇸',
    slots: {
      'r2c1': 'trump-feed',
      'r2c3': 'polling',
      'r3c1': 'newswire-domestic',
      'r3c2-left': 'executive-orders',
      'r3c2-right': 'congress-tracker',
      'r3c3': null,
    },
  },
  intel: {
    id: 'intel',
    label: 'INTEL',
    icon: '🕵️',
    slots: {
      'r2c1': 'leader-feed',
      'r2c3': 'newswire',
      'r3c1': 'global-narratives',
      'r3c2-left': 'intel-monitor',
      'r3c2-right': 'internet-freedom',
      'r3c3': 'ai-brief',
    },
  },
};

export function getPresetForView(view: ViewId, customSlots?: Partial<Record<SlotId, string | null>>): LayoutPreset {
  const base = VIEW_LAYOUT_PRESETS[view];
  if (!customSlots) return base;
  return {
    ...base,
    slots: { ...base.slots, ...customSlots },
  };
}
