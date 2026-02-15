import type { LayoutPreset } from './widgetRegistry';

// Option C: Fixed layout — context rotates, layout never changes
export const FIXED_LAYOUT: LayoutPreset = {
  id: 'fixed',
  label: 'ATLAS',
  icon: '🌐',
  slots: {
    'r2c1': 'leader-feed',
    'r2c3': 'markets',
    'r3c1': 'newswire',
    'r3c2-left': 'cii-dashboard',
    'r3c2-right': 'intel-center-right',
    'r3c3': 'ai-brief',
  },
};
