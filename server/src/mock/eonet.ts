import type { NaturalEvent } from '../types.js';

export const mockNaturalEvents: NaturalEvent[] = [
  { id: 'EONET_6412', title: 'Tropical Cyclone Freddy', category: 'Severe Storms', source: 'https://www.jtwc.mil/', lat: -18.5, lng: 42.3, date: '2025-02-10T06:00:00Z', severity: 'severe', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6412' },
  { id: 'EONET_6420', title: 'Wildfire — Los Angeles County, CA', category: 'Wildfires', source: 'https://inciweb.wildfire.gov/', lat: 34.07, lng: -118.55, date: '2025-02-09T18:00:00Z', severity: 'severe', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6420' },
  { id: 'EONET_6418', title: 'Earthquake M6.2 — Turkey', category: 'Earthquakes', source: 'https://earthquake.usgs.gov/', lat: 38.42, lng: 38.95, date: '2025-02-09T14:23:00Z', magnitude: 6.2, severity: 'severe', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6418' },
  { id: 'EONET_6415', title: 'Eruption of Popocatepetl', category: 'Volcanoes', source: 'https://volcano.si.edu/', lat: 19.02, lng: -98.62, date: '2025-02-08T12:00:00Z', severity: 'moderate', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6415' },
  { id: 'EONET_6422', title: 'Flooding — Bangladesh', category: 'Floods', source: 'https://reliefweb.int/', lat: 23.68, lng: 90.35, date: '2025-02-08T00:00:00Z', severity: 'moderate', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6422' },
  { id: 'EONET_6410', title: 'Arctic Sea Ice — Barents Sea anomaly', category: 'Sea & Lake Ice', source: 'https://nsidc.org/', lat: 76.0, lng: 40.0, date: '2025-02-07T00:00:00Z', severity: 'minor', link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6410' },
];
