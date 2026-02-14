export type TabId = 'global' | 'mideast' | 'ukraine' | 'domestic' | 'intel';

export const MAP_VIEWS: Record<TabId, { center: [number, number]; zoom: number }> = {
  global:   { center: [25, 20],     zoom: 2.5 },
  mideast:  { center: [28, 42],     zoom: 5 },
  ukraine:  { center: [48.5, 35],   zoom: 6 },
  domestic: { center: [39, -98],    zoom: 4.5 },
  intel:    { center: [25, 20],     zoom: 2.5 },
};

export const TAB_LABELS: { id: TabId; icon: string; label: string }[] = [
  { id: 'global',   icon: '\u{1F30D}', label: 'GLOBAL' },
  { id: 'mideast',  icon: '\u{1F54C}', label: 'MIDEAST' },
  { id: 'ukraine',  icon: '\u2694\uFE0F', label: 'UKRAINE' },
  { id: 'domestic', icon: '\u{1F1FA}\u{1F1F8}', label: 'DOMESTIC' },
  { id: 'intel',    icon: '\u{1F575}\uFE0F', label: 'INTEL' },
];
