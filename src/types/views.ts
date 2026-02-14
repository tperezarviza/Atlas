import type { TabId } from './tabs';

export type ViewId = TabId;

export interface ViewPreset {
  id: ViewId;
  icon: string;
  label: string;
  shortcut: string;
  description: string;
}

export const VIEW_PRESETS: ViewPreset[] = [
  { id: 'global',   icon: '\u{1F30D}', label: 'GLOBAL',   shortcut: 'Ctrl+1', description: 'Full global overview' },
  { id: 'mideast',  icon: '\u{1F54C}', label: 'MIDEAST',  shortcut: 'Ctrl+2', description: 'Middle East focus' },
  { id: 'ukraine',  icon: '\u2694\uFE0F', label: 'UKRAINE',  shortcut: 'Ctrl+3', description: 'Ukraine conflict' },
  { id: 'domestic', icon: '\u{1F1FA}\u{1F1F8}', label: 'DOMESTIC', shortcut: 'Ctrl+4', description: 'US domestic policy' },
  { id: 'intel',    icon: '\u{1F575}\uFE0F', label: 'INTEL',    shortcut: 'Ctrl+5', description: 'All-source intelligence' },
];

export const KIOSK_CYCLE: ViewId[] = ['global', 'mideast', 'ukraine', 'domestic', 'intel'];

export function isTabView(view: ViewId): view is TabId {
  return ['global', 'mideast', 'ukraine', 'domestic', 'intel'].includes(view);
}
