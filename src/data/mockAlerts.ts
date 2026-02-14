import type { Alert } from '../types';

export const mockAlerts: Alert[] = [
  {
    id: 'mock-alert-1',
    priority: 'flash',
    source: 'gdelt',
    title: 'CRITICAL: Major military escalation detected in Eastern Mediterranean',
    detail: 'GDELT tone -9.2 with keywords: missile, strike, troops',
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
    read: false,
  },
  {
    id: 'mock-alert-2',
    priority: 'urgent',
    source: 'acled',
    title: 'New armed conflict reported: Clashes erupt in North Kivu, DRC',
    detail: 'Previously untracked conflict zone with 12+ fatalities',
    timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
    read: false,
  },
  {
    id: 'mock-alert-3',
    priority: 'priority',
    source: 'ooni',
    title: 'Internet shutdown ongoing in Sudan — multiple ASNs affected',
    timestamp: new Date(Date.now() - 15 * 60_000).toISOString(),
    read: false,
  },
  {
    id: 'mock-alert-4',
    priority: 'routine',
    source: 'executive_orders',
    title: 'New Executive Order signed: Trade policy update',
    timestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
    read: true,
  },
];
