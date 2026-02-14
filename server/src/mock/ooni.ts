import type { InternetIncident } from '../types.js';

export const mockOoni: InternetIncident[] = [
  {
    id: 'ooni-1', country: 'Iran', countryCode: 'IR',
    title: 'Iran nationwide internet throttling',
    startDate: '2025-01-20T00:00:00Z',
    shortDescription: 'Severe bandwidth throttling on mobile networks during protests. Instagram, WhatsApp, and Telegram blocked.',
    eventType: 'throttling',
  },
  {
    id: 'ooni-2', country: 'Myanmar', countryCode: 'MM',
    title: 'Myanmar regional internet shutdowns',
    startDate: '2024-12-15T00:00:00Z',
    shortDescription: 'Junta-imposed blackout in Sagaing and Chin states during military offensives.',
    eventType: 'shutdown',
  },
  {
    id: 'ooni-3', country: 'Russia', countryCode: 'RU',
    title: 'Russia VPN and social media restrictions',
    startDate: '2025-01-05T00:00:00Z',
    shortDescription: 'Expanded blocking of VPN protocols and remaining independent news sites.',
    eventType: 'blocking',
  },
  {
    id: 'ooni-4', country: 'Pakistan', countryCode: 'PK',
    title: 'Pakistan social media disruption',
    startDate: '2025-01-28T00:00:00Z',
    shortDescription: 'X (Twitter) and VPN services disrupted during political unrest in Punjab.',
    eventType: 'throttling',
  },
  {
    id: 'ooni-5', country: 'Ethiopia', countryCode: 'ET',
    title: 'Ethiopia Tigray communications blackout',
    startDate: '2024-11-10T00:00:00Z',
    shortDescription: 'Continued internet restrictions in northern regions amid security operations.',
    eventType: 'shutdown',
  },
];
