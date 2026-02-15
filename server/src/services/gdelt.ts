import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { translateTexts } from './translate.js';
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
  // Thematic queries
  { query: '(conflict OR war OR military OR attack OR strike)', category: 'conflict', timespan: '60m', maxpoints: 500 },
  { query: '(terrorism OR terrorist OR bombing)', category: 'terrorism', timespan: '60m', maxpoints: 200 },
  { query: '(trump OR tariff OR border OR immigration)', category: 'us_politics', timespan: '60m', maxpoints: 200 },
  { query: '(iran OR nuclear OR enrichment OR IAEA)', category: 'nuclear', timespan: '24h', maxpoints: 100 },
  { query: '(china OR taiwan OR "south china sea" OR PLA)', category: 'china_threat', timespan: '24h', maxpoints: 100 },
  { query: '(ukraine OR russia OR kharkiv OR kursk OR zelensky)', category: 'russia_ukraine', timespan: '60m', maxpoints: 200 },
  { query: '(israel OR gaza OR hamas OR hezbollah OR houthi)', category: 'middle_east', timespan: '60m', maxpoints: 200 },
  { query: '(oil OR energy OR OPEC OR gas OR pipeline)', category: 'energy', timespan: '60m', maxpoints: 200 },
  { query: 'crisis OR disaster OR emergency', category: 'crisis', timespan: '60m', maxpoints: 300 },
  // Regional crises — catch conflicts in areas not covered by thematic queries
  { query: '(haiti OR "port-au-prince" OR gang OR cartel) (crisis OR violence OR attack OR killed)', category: 'latam_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(sudan OR khartoum OR darfur OR RSF OR SAF) (war OR fighting OR displaced OR militia)', category: 'africa_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(myanmar OR "min aung" OR rohingya OR junta) (coup OR fighting OR resistance)', category: 'asia_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(venezuela OR maduro) (protest OR crisis OR sanctions)', category: 'latam_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(ethiopia OR tigray OR amhara OR eritrea) (conflict OR fighting OR ceasefire)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(somalia OR al-shabaab) (attack OR killed OR military)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(libya OR sahel OR niger OR mali OR burkina) (coup OR militia OR junta OR insurgent)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(colombia OR "drug war" OR FARC OR ELN) (attack OR killed OR coca)', category: 'latam_crisis', timespan: '24h', maxpoints: 50 },
];

/** Extract the first article title from GDELT html field (contains <a> tags). */
function extractHeadline(html: string | undefined): string | undefined {
  if (!html) return undefined;
  // Try to extract text from the first <a> tag: <a ...>Title Here</a>
  const match = html.match(/<a[^>]*>([^<]+)<\/a>/);
  if (match?.[1]) {
    const text = match[1].trim();
    if (text && text !== 'No Title') return text;
  }
  // Fallback: strip all tags
  const plain = html.replace(/<[^>]*>/g, '').trim();
  return (plain && plain !== 'No Title') ? plain : undefined;
}

/** Batch-translate non-English headlines using the shared translate utility. */
async function translateHeadlines(points: NewsPoint[]): Promise<void> {
  const headlines = points.map((p) => p.headline);
  const translated = await translateTexts(headlines, 'GDELT');
  for (let i = 0; i < points.length; i++) {
    points[i].headline = translated[i];
  }
}

/** Convert a raw domain like "reuters.com" to a readable name like "Reuters". */
function formatDomain(domain: string | undefined): string {
  if (!domain) return 'GDELT';
  let name = domain.replace(/^www\./, '');
  name = name.replace(/\.(com|org|net|gov|int|edu|mil|io|info)(\.\w{2})?$/i, '');
  name = name.replace(/\.co(\.\w{2})?$/i, '');
  name = name
    .split(/[\.\-]/)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ');
  return name || 'GDELT';
}

async function fetchGdeltQuery(
  query: string,
  category: string,
  timespan: string,
  maxpoints: number
): Promise<NewsPoint[]> {
  const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=GeoJSON&timespan=${timespan}&maxpoints=${maxpoints}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return [];

  const data: GdeltGeoJSON = await res.json();
  if (!data.features) return [];

  const points: NewsPoint[] = [];
  for (let i = 0; i < data.features.length; i++) {
    const f = data.features[i];
    const headline = extractHeadline(f.properties.html) ?? (f.properties.name !== 'No Title' ? f.properties.name : undefined) ?? 'Unknown';
    if (headline === 'Unknown' || headline.length < 10) continue;
    points.push({
      id: `gdelt-${category}-${i}`,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      tone: f.properties.urltone ?? 0,
      headline,
      source: formatDomain(f.properties.domain),
      category,
    });
  }
  return points;
}

function deduplicateNews(points: NewsPoint[]): NewsPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const key = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}_${p.headline.substring(0, 40).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newsToWire(news: NewsPoint[], fetchedAt: number): NewsWireItem[] {
  const sorted = [...news].sort((a, b) => a.tone - b.tone);
  return sorted.slice(0, 20).map((n, i) => {
    let bullet: NewsBullet = 'medium';
    if (n.tone < -7) bullet = 'critical';
    else if (n.tone < -4) bullet = 'high';
    else if (n.tone > 0) bullet = 'accent';

    const elapsedMin = Math.floor((Date.now() - fetchedAt) / 60_000);
    const time = elapsedMin < 1 ? 'now' : `${elapsedMin}m`;

    return {
      id: `nw-${i}`,
      bullet,
      source: n.source,
      time,
      headline: n.headline,
      tone: n.tone,
    };
  });
}

export async function fetchGdeltNews(): Promise<void> {
  console.log(`[GDELT] Fetching news from ${GDELT_QUERIES.length} thematic + regional queries...`);

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

      // Translate non-English headlines before caching
      await translateHeadlines(deduped);

      const fetchedAt = Date.now();
      cache.set('news', deduped, TTL.NEWS);
      console.log(`[GDELT] Total: ${deduped.length} unique news points cached`);

      const wire = newsToWire(deduped, fetchedAt);
      cache.set('newswire', wire, TTL.NEWS);
    } else {
      console.warn('[GDELT] No data received, keeping cache/mock');
    }
  } catch (err) {
    console.error('[GDELT] Fetch failed:', err);
  }
}
