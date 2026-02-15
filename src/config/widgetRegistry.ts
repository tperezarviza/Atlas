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
  { id: 'ai-brief', label: 'AI Brief', icon: '🤖' },
  { id: 'cii-dashboard', label: 'Instability Index', icon: '📊' },
  { id: 'polymarket', label: 'Prediction Markets', icon: '📈' },
  { id: 'focal-points', label: 'Focal Points', icon: '🎯' },
  { id: 'intel-center-right', label: 'Predictions & Focal Points', icon: '🎯' },
];

export interface LayoutPreset {
  id: string;
  label: string;
  icon: string;
  slots: Record<SlotId, string | null>;
}
