import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { isRedisConnected } from '../redis.js';
import { getCircuitStates } from '../utils/circuit-breaker.js';
import { isBigQueryAvailable } from '../services/bigquery.js';
import { getDailyBytes, bytesToCost } from '../services/bq-cost-tracker.js';
import { getProviderStats } from '../utils/ai-client.js';
import { ADMIN_API_KEY } from '../config.js';

const CACHE_KEYS = [
  'conflicts', 'news', 'feed', 'markets', 'forex',
  'macro', 'calendar', 'brief', 'ticker',
  'countries', 'ofac_sanctions', 'armed_groups', 'shipping', 'ooni', 'hostility', 'propaganda', 'acled_actors',
  'congress_bills', 'congress_nominations', 'executive_orders', 'flights', 'ukraine_front',
  'twitter', 'cyber_threats', 'natural_events', 'economic_calendar', 'alerts',
  'earthquakes',
  'unsc_calendar',
  'cloudflare_outages',
  'fire_hotspots',
  'polymarket',
  'cii',
  'focal_points',
  'layer_bases',
  'layer_cables',
  'layer_pipelines',
  'google_trends',
  'bq_event_spikes',
  'bq_military_cameo',
  'surge_alerts',
];

// Map cache keys to human-readable service names and categories
const SERVICE_META: Record<string, { name: string; category: string }> = {
  conflicts: { name: 'ACLED Conflicts', category: 'Intelligence' },
  news: { name: 'GDELT News', category: 'Intelligence' },
  feed: { name: 'Leader Feed', category: 'Intelligence' },
  markets: { name: 'Markets (Yahoo)', category: 'Markets' },
  forex: { name: 'Forex Rates', category: 'Markets' },
  macro: { name: 'US Macro', category: 'Markets' },
  calendar: { name: 'Diplomatic Calendar', category: 'Intelligence' },
  brief: { name: 'AI Brief', category: 'Intelligence' },
  ticker: { name: 'News Ticker', category: 'Intelligence' },
  countries: { name: 'Country Profiles', category: 'Intelligence' },
  ofac_sanctions: { name: 'OFAC Sanctions', category: 'Intelligence' },
  armed_groups: { name: 'Armed Groups', category: 'Intelligence' },
  shipping: { name: 'Shipping/Chokepoints', category: 'Maritime' },
  ooni: { name: 'Internet Freedom', category: 'Cyber' },
  hostility: { name: 'Hostility Index', category: 'Intelligence' },
  propaganda: { name: 'Propaganda Monitor', category: 'Intelligence' },
  acled_actors: { name: 'ACLED Actors', category: 'Intelligence' },
  congress_bills: { name: 'Congress Bills', category: 'Domestic' },
  congress_nominations: { name: 'Nominations', category: 'Domestic' },
  executive_orders: { name: 'Executive Orders', category: 'Domestic' },
  flights: { name: 'Military Flights', category: 'Military' },
  ukraine_front: { name: 'Ukraine Front', category: 'Military' },
  twitter: { name: 'X/Twitter Intel', category: 'Intelligence' },
  cyber_threats: { name: 'Cyber Threats', category: 'Cyber' },
  natural_events: { name: 'Natural Events (NASA)', category: 'Intelligence' },
  economic_calendar: { name: 'Economic Calendar', category: 'Markets' },
  alerts: { name: 'Alerts Engine', category: 'System' },
  earthquakes: { name: 'USGS Earthquakes', category: 'Intelligence' },
  unsc_calendar: { name: 'UNSC Calendar', category: 'Intelligence' },
  cloudflare_outages: { name: 'Cloudflare Radar', category: 'Cyber' },
  fire_hotspots: { name: 'NASA FIRMS Fires', category: 'Intelligence' },
  polymarket: { name: 'Polymarket Predictions', category: 'Markets' },
  cii: { name: 'Country Instability Index', category: 'Intelligence' },
  focal_points: { name: 'Focal Point Detection', category: 'Intelligence' },
  layer_bases: { name: 'Military Bases Layer', category: 'Map Layers' },
  layer_cables: { name: 'Undersea Cables Layer', category: 'Map Layers' },
  layer_pipelines: { name: 'Pipelines Layer', category: 'Map Layers' },
  google_trends: { name: 'Google Trends', category: 'BigQuery' },
  bq_event_spikes: { name: 'BQ Event Spikes', category: 'BigQuery' },
  bq_military_cameo: { name: 'BQ Military CAMEO', category: 'BigQuery' },
  surge_alerts: { name: 'Surge Detection', category: 'Military' },
};

const startTime = Date.now();

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/health', async (req) => {
    const services: { key: string; name: string; category: string; status: 'ok' | 'stale' | 'empty'; ageSeconds: number | null; ageMinutes: number | null; lastUpdate: string | null }[] = [];

    for (const key of CACHE_KEYS) {
      const fresh = cache.isFresh(key);
      const ageMs = cache.age(key);
      const setAt = cache.getSetAt(key);
      const meta = SERVICE_META[key] ?? { name: key, category: 'Other' };

      services.push({
        key,
        name: meta.name,
        category: meta.category,
        status: ageMs === null ? 'empty' : fresh ? 'ok' : 'stale',
        ageSeconds: ageMs !== null ? Math.floor(ageMs / 1000) : null,
        ageMinutes: ageMs !== null ? Math.round(ageMs / 60000) : null,
        lastUpdate: setAt !== null ? new Date(setAt).toISOString() : null,
      });
    }

    const okCount = services.filter(s => s.status === 'ok').length;
    const totalCount = services.length;

    const bqEnabled = isBigQueryAvailable();
    const bqDailyBytes = bqEnabled ? await getDailyBytes() : 0;

    // Tiered: public gets summary, admin gets full details
    const isAdmin = ADMIN_API_KEY && req.headers['x-api-key'] === ADMIN_API_KEY;
    if (!isAdmin) {
      return {
        status: okCount > totalCount * 0.5 ? 'ok' : 'degraded',
        servicesOk: okCount,
        servicesTotal: totalCount,
        summary: { ok: okCount, total: totalCount },
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
    }
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      redisConnected: isRedisConnected(),
      bigquery: {
        enabled: bqEnabled,
        dailyBytesProcessed: bqDailyBytes,
        dailyCostEstimate: `$${bytesToCost(bqDailyBytes).toFixed(4)}`,
      },
      summary: { ok: okCount, total: totalCount },
      circuitBreakers: getCircuitStates(),
      aiProviders: getProviderStats(),
      services,
    };
  });
}
