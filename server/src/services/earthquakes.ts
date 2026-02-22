import { cache } from '../cache.js';
import { TTL } from '../config.js';

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    title: string;
    alert: string | null;
    tsunami: number;
    type: string;
  };
  geometry: {
    coordinates: [number, number, number]; // lng, lat, depth
  };
}

interface USGSResponse {
  features: USGSFeature[];
  metadata: { count: number; title: string };
}

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  lat: number;
  lng: number;
  depth: number;
  url: string;
  alert: string | null;
  tsunami: boolean;
}

export async function fetchEarthquakes(): Promise<void> {
  if (cache.isFresh('earthquakes')) return;

  console.log('[USGS] Fetching earthquake data...');
  try {
    // Significant earthquakes in the last 30 days (M4.5+)
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data: USGSResponse = await res.json();

    const quakes: Earthquake[] = data.features
      .filter(f => f.properties.type === 'earthquake')
      .slice(0, 100) // limit to 100 most recent
      .map(f => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: new Date(f.properties.time).toISOString(),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        url: f.properties.url,
        alert: f.properties.alert,
        tsunami: f.properties.tsunami === 1,
      }));

    cache.set('earthquakes', quakes, TTL.CALENDAR);
    console.log(`[USGS] ${quakes.length} earthquakes cached`);
  } catch (err) {
    console.error('[USGS] Fetch failed:', err);
  }
}
