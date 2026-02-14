export type SlotId = 'r2c1' | 'r2c3' | 'r3c1' | 'r3c2-left' | 'r3c2-right' | 'r3c3';

export const ALL_SLOTS: SlotId[] = ['r2c1', 'r2c3', 'r3c1', 'r3c2-left', 'r3c2-right', 'r3c3'];

export const SLOT_LABELS: Record<SlotId, string> = {
  'r2c1': 'Top Left',
  'r2c3': 'Top Right',
  'r3c1': 'Bottom Left',
  'r3c2-left': 'Bottom Center-Left',
  'r3c2-right': 'Bottom Center-Right',
  'r3c3': 'Bottom Right',
};

export interface WidgetDef {
  id: string;
  label: string;
  icon: string;
}

export const WIDGETS: WidgetDef[] = [
  { id: 'leader-feed', label: 'Leader Feed', icon: '📡' },
  { id: 'markets', label: 'Markets & Indicators', icon: '📈' },
  { id: 'newswire', label: 'Breaking Wire', icon: '📰' },
  { id: 'intel-monitor', label: 'Intel Monitor', icon: '🕵️' },
  { id: 'ai-brief', label: 'AI Brief', icon: '🤖' },
  { id: 'global-narratives', label: 'Global Narratives', icon: '🌐' },
  { id: 'newswire-me', label: 'Breaking: Middle East', icon: '📰' },
  { id: 'ukraine-leader', label: 'Ukraine Intel', icon: '🇺🇦' },
  { id: 'ukraine-metrics', label: 'Ukraine War Metrics', icon: '📊' },
  { id: 'russian-military', label: 'Russian Military Activity', icon: '🔴' },
  { id: 'newswire-ua', label: 'Breaking: Ukraine', icon: '📰' },
  { id: 'nato-response', label: 'NATO Response', icon: '🛡️' },
  { id: 'trump-feed', label: 'Trump Feed', icon: '🇺🇸' },
  { id: 'executive-orders', label: 'Executive Orders', icon: '📜' },
  { id: 'congress-tracker', label: 'Congress Tracker', icon: '🏛️' },
  { id: 'internet-freedom', label: 'Internet Freedom', icon: '🌐' },
  { id: 'newswire-domestic', label: 'Breaking: Domestic', icon: '📰' },
];

export interface LayoutPreset {
  id: string;
  label: string;
  icon: string;
  slots: Record<SlotId, string | null>;
}
