import type { UkraineFrontData } from '../types.js';

export const mockUkraineFront: UkraineFrontData = {
  source: 'acled_static',
  recent_events: [
    { id: 'ua-1', date: '2025-02-10', location: 'Pokrovsk, Donetsk', type: 'battle', fatalities: 0, lat: 48.28, lng: 37.18 },
    { id: 'ua-2', date: '2025-02-10', location: 'Kupiansk, Kharkiv', type: 'shelling', fatalities: 3, lat: 49.71, lng: 37.62 },
    { id: 'ua-3', date: '2025-02-09', location: 'Zaporizhzhia front', type: 'battle', fatalities: 0, lat: 47.5, lng: 35.8 },
    { id: 'ua-4', date: '2025-02-09', location: 'Bakhmut area, Donetsk', type: 'battle', fatalities: 0, lat: 48.59, lng: 38.0 },
    { id: 'ua-5', date: '2025-02-08', location: 'Kherson shelling', type: 'shelling', fatalities: 2, lat: 46.63, lng: 32.62 },
    { id: 'ua-6', date: '2025-02-08', location: 'Vuhledar area, Donetsk', type: 'battle', fatalities: 0, lat: 47.77, lng: 37.25 },
    { id: 'ua-7', date: '2025-02-07', location: 'Avdiivka direction', type: 'battle', fatalities: 0, lat: 48.14, lng: 37.74 },
    { id: 'ua-8', date: '2025-02-07', location: 'Kyiv drone attack', type: 'drone_strike', fatalities: 1, lat: 50.45, lng: 30.52 },
  ],
  territory_summary: 'Russia maintains offensive pressure along the Donetsk front, particularly around Pokrovsk and the Bakhmut-Chasiv Yar axis. Ukrainian forces conducting active defense with localized counterattacks near Kupiansk.',
  last_updated: '2025-02-10T12:00:00Z',
};
