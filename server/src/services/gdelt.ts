import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { mockNews } from '../mock/news.js';
import { mockNewsWire } from '../mock/newsWire.js';
import type { NewsPoint, NewsWireItem, NewsBullet } from '../types.js';

interface GdeltFeature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    name?: string;
    url?: string;
    domain?: string;
    urltone?: number;
    mentionednames?: string;
    html?: string;
    shareimage?: string;
  };
}

interface GdeltGeoJSON {
  type: string;
  features: GdeltFeature[];
}

const GDELT_QUERIES = [
  { query: '(conflict OR war OR military OR attack OR strike)', category: 'conflict', timespan: '60m', maxpoints: 500 },
  { query: '(terrorism OR terrorist OR bombing)', category: 'terrorism', timespan: '60m', maxpoints: 200 },
  { query: '(trump OR tariff OR border OR immigration)', category: 'us_politics', timespan: '60m', maxpoints: 200 },
  { query: '(iran OR nuclear OR enrichment OR IAEA)', category: 'nuclear', timespan: '24h', maxpoints: 100 },
  { query: '(china OR taiwan OR "south china sea" OR PLA)', category: 'china_threat', timespan: '24h', maxpoints: 100 },
  { query: '(ukraine OR russia OR kharkiv OR kursk OR zelensky)', category: 'russia_ukraine', timespan: '60m', maxpoints: 200 },
  { query: '(israel OR gaza OR hamas OR hezbollah OR houthi)', category: 'middle_east', timespan: '60m', maxpoints: 200 },
  { query: '(oil OR energy OR OPEC OR gas OR pipeline)', category: 'energy', timespan: '60m', maxpoints: 200 },
  { query: 'crisis OR disaster OR emergency', category: 'crisis', timespan: '60m', maxpoints: 300 },
];

async function fetchGdeltQuery(
  query: string,
  category: string,
  timespan: string,
  maxpoints: number
): Promise<NewsPoint[]> {
  const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=GeoJSON&timespan=${timespan}&maxpoints=${maxpoints}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
  if (!res.ok) return [];

  const data: GdeltGeoJSON = await res.json();
  if (!data.features) return [];

  return data.features.map((f, i) => ({
    id: `gdelt-${category}-${i}`,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    tone: f.properties.urltone ?? 0,
    headline: f.properties.name ?? 'Unknown',
    source: f.properties.domain ?? 'GDELT',
    category,
  }));
}

function deduplicateNews(points: NewsPoint[]): NewsPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    // Dedupe by approximate location + headline similarity
    const key = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}_${p.headline.substring(0, 40).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newsToWire(news: NewsPoint[], fetchedAt: number): NewsWireItem[] {
  const sorted = [...news].sort((a, b) => a.tone - b.tone); // most negative first
  return sorted.slice(0, 20).map((n, i) => {
    let bullet: NewsBullet = 'medium';
    if (n.tone < -7) bullet = 'critical';
    else if (n.tone < -4) bullet = 'high';
    else if (n.tone > 0) bullet = 'accent';

    // Approximate time since fetch (items are from the GDELT timespan window)
    const elapsedMin = Math.floor((Date.now() - fetchedAt) / 60_000);
    const time = elapsedMin < 1 ? 'now' : `${elapsedMin}m`;

    return {
      id: `nw-${i}`,
      bullet,
      source: n.source.replace(/\.(com|org|net|gov)$/i, ''),
      time,
      headline: n.headline,
      tone: n.tone,
    };
  });
}

export async function fetchGdeltNews(): Promise<void> {
  console.log('[GDELT] Fetching news from 9 thematic queries...');

  try {
    const results = await Promise.allSettled(
      GDELT_QUERIES.map((q) =>
        fetchGdeltQuery(q.query, q.category, q.timespan, q.maxpoints)
      )
    );

    const allPoints: NewsPoint[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        allPoints.push(...r.value);
        console.log(`[GDELT] ${GDELT_QUERIES[i].category}: ${r.value.length} points`);
      } else {
        console.warn(`[GDELT] ${GDELT_QUERIES[i].category} failed:`, r.reason);
      }
    });

    if (allPoints.length > 0) {
      const deduped = deduplicateNews(allPoints);
      const fetchedAt = Date.now();
      cache.set('news', deduped, TTL.NEWS);
      console.log(`[GDELT] Total: ${deduped.length} unique news points cached`);

      // Also generate newswire from news
      const wire = newsToWire(deduped, fetchedAt);
      cache.set('newswire', wire, TTL.NEWS);
    } else {
      console.warn('[GDELT] No data received, keeping cache/mock');
    }
  } catch (err) {
    console.error('[GDELT] Fetch failed:', err);
  }
}
