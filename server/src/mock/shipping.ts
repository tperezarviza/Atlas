import type { Chokepoint } from '../types.js';

export const mockShipping: Chokepoint[] = [
  {
    id: 'cp-hormuz', name: 'Strait of Hormuz', lat: 26.56, lng: 56.25, region: 'Middle East',
    dailyVessels: 80, oilFlowMbpd: 21.0, globalTradePercent: 21,
    status: 'elevated', statusReason: 'Iran-Israel tensions; IRGC naval activity',
    nearbyVessels: null, recentIncidents: ['Iranian seizure of tanker (Jan 2025)', 'US Navy escort ops'],
  },
  {
    id: 'cp-bab', name: 'Bab el-Mandeb', lat: 12.58, lng: 43.33, region: 'Red Sea',
    dailyVessels: 55, oilFlowMbpd: 6.2, globalTradePercent: 12,
    status: 'critical', statusReason: 'Houthi anti-shipping campaign ongoing',
    nearbyVessels: null, recentIncidents: ['Houthi drone strike on bulk carrier', 'US destroyer intercepts missiles'],
  },
  {
    id: 'cp-suez', name: 'Suez Canal', lat: 30.46, lng: 32.34, region: 'Middle East',
    dailyVessels: 50, oilFlowMbpd: 5.5, globalTradePercent: 12,
    status: 'disrupted', statusReason: 'Traffic down 50% — rerouting via Cape of Good Hope',
    nearbyVessels: null, recentIncidents: ['Major carriers suspending transit'],
  },
  {
    id: 'cp-malacca', name: 'Strait of Malacca', lat: 2.5, lng: 101.5, region: 'Southeast Asia',
    dailyVessels: 90, oilFlowMbpd: 16.0, globalTradePercent: 25,
    status: 'normal', statusReason: undefined,
    nearbyVessels: null, recentIncidents: [],
  },
  {
    id: 'cp-taiwan', name: 'Taiwan Strait', lat: 24.0, lng: 119.5, region: 'East Asia',
    dailyVessels: 240, oilFlowMbpd: 5.3, globalTradePercent: 10,
    status: 'elevated', statusReason: 'PLA Navy exercises; semiconductor supply chain risk',
    nearbyVessels: null, recentIncidents: ['PLA Eastern Theater Command exercises'],
  },
];
