import type { NuclearFacility } from '../types';

export const nuclearFacilities: NuclearFacility[] = [
  { id: 'nf-dimona', name: 'Dimona (Negev)', country: 'IL', lat: 31.00, lng: 35.14, type: 'reactor', status: 'active' },
  { id: 'nf-bushehr', name: 'Bushehr NPP', country: 'IR', lat: 28.83, lng: 50.88, type: 'reactor', status: 'active' },
  { id: 'nf-fordow', name: 'Fordow', country: 'IR', lat: 34.88, lng: 51.59, type: 'enrichment', status: 'active' },
  { id: 'nf-natanz', name: 'Natanz', country: 'IR', lat: 33.72, lng: 51.73, type: 'enrichment', status: 'active' },
  { id: 'nf-yongbyon', name: 'Yongbyon', country: 'KP', lat: 39.79, lng: 125.75, type: 'reactor', status: 'active' },
  { id: 'nf-punggye', name: 'Punggye-ri', country: 'KP', lat: 41.28, lng: 129.08, type: 'test_site', status: 'inactive' },
  { id: 'nf-kahuta', name: 'Kahuta (KRL)', country: 'PK', lat: 33.59, lng: 73.39, type: 'enrichment', status: 'active' },
  { id: 'nf-barc', name: 'BARC Trombay', country: 'IN', lat: 19.01, lng: 72.92, type: 'research', status: 'active' },
  { id: 'nf-sellafield', name: 'Sellafield', country: 'GB', lat: 54.42, lng: -3.50, type: 'storage', status: 'active' },
  { id: 'nf-la-hague', name: 'La Hague', country: 'FR', lat: 49.68, lng: -1.88, type: 'storage', status: 'active' },
  { id: 'nf-rokkasho', name: 'Rokkasho', country: 'JP', lat: 40.96, lng: 141.33, type: 'enrichment', status: 'active' },
  { id: 'nf-zaporizhzhia', name: 'Zaporizhzhia NPP', country: 'UA', lat: 47.51, lng: 34.58, type: 'reactor', status: 'under_construction' },
];
