import type { SatelliteData } from '../types.js';

export const mockSatellite: SatelliteData = {
  watchpoints: [
    { id: 'ir-natanz', name: 'Natanz Nuclear Facility', description: 'Iran primary enrichment facility', lat: 33.72, lng: 51.73, bbox: [51.70, 33.69, 51.76, 33.75], category: 'nuclear', country: 'IR', monitoring_reason: 'Uranium enrichment activity', check_frequency_hours: 48, latest_images: [], last_checked: '2025-02-11T00:00:00Z' },
    { id: 'kp-yongbyon', name: 'Yongbyon Nuclear Complex', description: 'North Korea primary nuclear facility', lat: 39.79, lng: 125.75, bbox: [125.72, 39.76, 125.78, 39.82], category: 'nuclear', country: 'KP', monitoring_reason: 'Reactor activity', check_frequency_hours: 72, latest_images: [], last_checked: '2025-02-11T00:00:00Z' },
    { id: 'ru-sevastopol', name: 'Sevastopol Naval Base', description: 'Russia Black Sea Fleet HQ', lat: 44.62, lng: 33.53, bbox: [33.48, 44.58, 33.58, 44.66], category: 'military_base', country: 'RU', monitoring_reason: 'Fleet movements', check_frequency_hours: 48, latest_images: [], last_checked: '2025-02-11T00:00:00Z' },
    { id: 'ua-kharkiv', name: 'Kharkiv Oblast Front', description: 'Active combat zone Ukraine', lat: 49.99, lng: 36.23, bbox: [35.8, 49.5, 36.7, 50.5], category: 'conflict_zone', country: 'UA', monitoring_reason: 'Front line changes', check_frequency_hours: 48, latest_images: [], last_checked: '2025-02-11T00:00:00Z' },
    { id: 'ps-gaza', name: 'Gaza Strip', description: 'Active conflict zone', lat: 31.42, lng: 34.36, bbox: [34.22, 31.22, 34.55, 31.60], category: 'conflict_zone', country: 'PS', monitoring_reason: 'Destruction assessment', check_frequency_hours: 48, latest_images: [], last_checked: '2025-02-11T00:00:00Z' },
  ],
};
