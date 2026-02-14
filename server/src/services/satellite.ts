import { TTL } from '../config.js';
import { cache } from '../cache.js';
import type { SatelliteWatchpoint, SatelliteData } from '../types.js';

// ── Strategic Watchpoints (static intelligence data) ──

const WATCHPOINTS: SatelliteWatchpoint[] = [
  { id: 'ir-natanz', name: 'Natanz Nuclear Facility', description: 'Iran primary enrichment facility', lat: 33.72, lng: 51.73, bbox: [51.70, 33.69, 51.76, 33.75], category: 'nuclear', country: 'IR', monitoring_reason: 'Uranium enrichment activity', check_frequency_hours: 48 },
  { id: 'ir-fordow', name: 'Fordow Fuel Enrichment Plant', description: 'Iran underground enrichment facility', lat: 34.88, lng: 51.59, bbox: [51.56, 34.85, 51.62, 34.91], category: 'nuclear', country: 'IR', monitoring_reason: 'High-enrichment activity', check_frequency_hours: 48 },
  { id: 'kp-yongbyon', name: 'Yongbyon Nuclear Complex', description: 'North Korea primary nuclear facility', lat: 39.79, lng: 125.75, bbox: [125.72, 39.76, 125.78, 39.82], category: 'nuclear', country: 'KP', monitoring_reason: 'Reactor activity', check_frequency_hours: 72 },
  { id: 'kp-punggye', name: 'Punggye-ri Nuclear Test Site', description: 'North Korea nuclear test tunnels', lat: 41.28, lng: 129.08, bbox: [129.05, 41.25, 129.11, 41.31], category: 'nuclear', country: 'KP', monitoring_reason: 'Tunnel activity', check_frequency_hours: 72 },
  { id: 'ru-sevastopol', name: 'Sevastopol Naval Base', description: 'Russia Black Sea Fleet HQ', lat: 44.62, lng: 33.53, bbox: [33.48, 44.58, 33.58, 44.66], category: 'military_base', country: 'RU', monitoring_reason: 'Fleet movements', check_frequency_hours: 48 },
  { id: 'cn-fiery-cross', name: 'Fiery Cross Reef', description: 'China artificial island military base', lat: 9.55, lng: 112.89, bbox: [112.85, 9.51, 112.93, 9.59], category: 'military_base', country: 'CN', monitoring_reason: 'Military buildup', check_frequency_hours: 72 },
  { id: 'cn-fujian', name: 'Fujian Coast Military Staging', description: 'PLA staging areas opposite Taiwan', lat: 24.5, lng: 118.1, bbox: [117.9, 24.3, 118.3, 24.7], category: 'military_base', country: 'CN', monitoring_reason: 'Taiwan contingency staging', check_frequency_hours: 72 },
  { id: 'ru-kaliningrad', name: 'Kaliningrad Military District', description: 'Russia western exclave', lat: 54.71, lng: 20.51, bbox: [20.3, 54.55, 20.7, 54.85], category: 'military_base', country: 'RU', monitoring_reason: 'NATO border deployment', check_frequency_hours: 72 },
  { id: 'ir-bandar-abbas', name: 'Bandar Abbas Naval Base', description: 'IRGC Navy main base, Hormuz control', lat: 27.19, lng: 56.27, bbox: [56.22, 27.14, 56.32, 27.24], category: 'military_base', country: 'IR', monitoring_reason: 'Fast boat activity', check_frequency_hours: 72 },
  { id: 'ua-kharkiv', name: 'Kharkiv Oblast Front', description: 'Active combat zone Ukraine', lat: 49.99, lng: 36.23, bbox: [35.8, 49.5, 36.7, 50.5], category: 'conflict_zone', country: 'UA', monitoring_reason: 'Front line changes', check_frequency_hours: 48 },
  { id: 'ps-gaza', name: 'Gaza Strip', description: 'Active conflict zone', lat: 31.42, lng: 34.36, bbox: [34.22, 31.22, 34.55, 31.60], category: 'conflict_zone', country: 'PS', monitoring_reason: 'Destruction assessment', check_frequency_hours: 48 },
  { id: 'sd-el-fasher', name: 'El-Fasher, Darfur', description: 'RSF siege in Sudan', lat: 13.63, lng: 25.35, bbox: [25.2, 13.5, 25.5, 13.8], category: 'conflict_zone', country: 'SD', monitoring_reason: 'RSF advance', check_frequency_hours: 72 },
];

export async function fetchSatellite(): Promise<void> {
  if (cache.isFresh('satellite')) return;

  const wpData: SatelliteData['watchpoints'] = WATCHPOINTS.map((wp) => ({
    ...wp,
    latest_images: [],
    last_checked: new Date().toISOString(),
  }));

  cache.set('satellite', { watchpoints: wpData } satisfies SatelliteData, TTL.SATELLITE);
  console.log(`[SATELLITE] Cached ${wpData.length} watchpoints (static data only)`);
}

export { WATCHPOINTS };
