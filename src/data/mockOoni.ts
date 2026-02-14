import type { InternetIncident } from '../types';

export const mockOoni: InternetIncident[] = [
  {
    id: 'ooni-1', country: 'Iran', countryCode: 'IR',
    title: 'Iran nationwide internet throttling',
    startDate: '2025-01-20T00:00:00Z',
    shortDescription: 'Severe bandwidth throttling on mobile networks during protests.',
    eventType: 'throttling',
  },
  {
    id: 'ooni-2', country: 'Myanmar', countryCode: 'MM',
    title: 'Myanmar regional internet shutdowns',
    startDate: '2024-12-15T00:00:00Z',
    shortDescription: 'Junta-imposed blackout in Sagaing and Chin states.',
    eventType: 'shutdown',
  },
  {
    id: 'ooni-3', country: 'Russia', countryCode: 'RU',
    title: 'Russia VPN and social media restrictions',
    startDate: '2025-01-05T00:00:00Z',
    shortDescription: 'Expanded blocking of VPN protocols and independent news sites.',
    eventType: 'blocking',
  },
];
