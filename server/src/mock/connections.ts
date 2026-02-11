import type { Connection } from '../types.js';

export const mockConnections: Connection[] = [
  { id: 'cn1', from: [35.69, 51.39], to: [31.35, 34.31], type: 'proxy_war', label: 'Iran → Hamas proxy' },
  { id: 'cn2', from: [35.69, 51.39], to: [15.55, 48.52], type: 'arms_flow', label: 'Iran → Houthi arms' },
  { id: 'cn3', from: [35.69, 51.39], to: [35.24, 38.97], type: 'proxy_war', label: 'Iran → Syria proxy' },
  { id: 'cn4', from: [35.69, 51.39], to: [48.37, 35.18], type: 'arms_flow', label: 'Iran → Russia drones' },
  { id: 'cn5', from: [48.37, 35.18], to: [39.03, 125.75], type: 'alliance', label: 'Russia-DPRK alliance' },
  { id: 'cn6', from: [31.35, 34.31], to: [15.55, 48.52], type: 'spillover', label: 'Gaza ↔ Red Sea spillover' },
  { id: 'cn7', from: [31.35, 34.31], to: [33.8, 35.5], type: 'proxy_war', label: 'Israel ↔ Hezbollah' },
  { id: 'cn8', from: [23.7, 120.96], to: [12, 114], type: 'military', label: 'China SCS-Taiwan axis' },
  { id: 'cn9', from: [14.72, -1.52], to: [2.05, 45.32], type: 'spillover', label: 'Sahel-Somalia jihadi link' },
  { id: 'cn10', from: [-1.68, 29.22], to: [15.5, 32.56], type: 'spillover', label: 'DRC-Sudan regional instability' },
];
