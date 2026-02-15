import { fetchMarkets } from './markets.js';
import { fetchFeeds } from './feeds.js';
import { fetchGdeltNews } from './gdelt.js';
import { composeTicker } from './ticker.js';
import { fetchConflicts } from './acled.js';
import { fetchMacro } from './macro.js';
import { fetchCalendar } from './calendar.js';
import { fetchBorderStats } from './border.js';
import { generateAllBriefs } from './ai-brief.js';
import { fetchConnections } from './connections.js';
import { fetchOoniIncidents } from './ooni.js';
import { fetchSanctions } from './sanctions.js';
import { fetchShippingData } from './shipping.js';
import { fetchCountries } from './countries.js';
import { fetchArmedGroups } from './terrorism.js';
import { fetchHostilityIndex } from './hostility.js';
import { fetchPropaganda } from './propaganda.js';
import { fetchCongress } from './congress.js';
import { fetchExecutiveOrders } from './executive-orders.js';
import { fetchFlights } from './flights.js';
import { fetchUkraineFront } from './ukraine-front.js';
import { fetchTwitterPrimary, setMonthlyTweetsRead, setQueryIndex } from './twitter.js';
import { fetchCyberThreats } from './cyber.js';
import { fetchNaturalEvents } from './eonet.js';
import { fetchEconomicCalendar } from './economic-calendar.js';
import { analyzeAlerts, restoreAlertState } from './alerts.js';
import { fetchEarthquakes } from './earthquakes.js';
import { fetchUNSC } from './unsc.js';
import { fetchCloudflareOutages } from './cloudflare-radar.js';
import { fetchFirmsHotspots } from './firms.js';
import { fetchPolymarket } from './polymarket.js';
import { computeCII } from './cii.js';
import { detectFocalPoints } from './focal-points.js';
import { runAnomalyDetection } from './anomaly-detector.js';
import { fetchCountryToneBQ } from './cii-bq.js';
import { detectGeoConvergence } from './geo-convergence.js';
import { fetchGoogleTrends } from './google-trends-bq.js';
import { detectSurges } from './surge-detection.js';
import { cache } from '../cache.js';
import { redisGet } from '../redis.js';

async function safeRun(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[WARMUP] ${name} failed:`, err instanceof Error ? err.message : err);
  }
}

async function warmupFromRedis(): Promise<void> {
  console.log('[WARMUP] Loading Redis backups...');
  const keysToRestore = [
    'brief', 'brief:mideast', 'brief:ukraine', 'brief:domestic', 'brief:intel',
    'twitter', 'propaganda', 'connections', 'hostility', 'focal_points',
  ];
  let restored = 0;
  for (const key of keysToRestore) {
    const data = await redisGet(`cache:${key}`).catch(() => null);
    if (data !== null) {
      cache.set(key, data, 120_000); // 2 min bridge TTL
      restored++;
    }
  }

  // Restore Twitter state
  const tweetCount = await redisGet<number>('state:twitterMonthlyCount').catch(() => null);
  if (tweetCount !== null) setMonthlyTweetsRead(tweetCount);

  const qIdx = await redisGet<number>('state:twitterQueryIndex').catch(() => null);
  if (qIdx !== null) setQueryIndex(qIdx);

  // Restore alert hashes
  await restoreAlertState();

  console.log(`[WARMUP] Restored ${restored}/${keysToRestore.length} caches from Redis`);
}

export async function warmUpCache(): Promise<void> {
  console.log('[WARMUP] Starting cache warmup...');
  const start = Date.now();

  // Phase 0: Restore from Redis (instant, fills panels while fresh data loads)
  await warmupFromRedis();

  // Phase 1: Free APIs in parallel (fast, no auth needed)
  await Promise.allSettled([
    safeRun('GDELT', fetchGdeltNews),
    safeRun('Feeds', fetchFeeds),
    safeRun('Markets', fetchMarkets),
    safeRun('Calendar', fetchCalendar),
    safeRun('OONI', fetchOoniIncidents),
    safeRun('Executive Orders', fetchExecutiveOrders),
    safeRun('EONET', fetchNaturalEvents),
    safeRun('Econ Calendar', fetchEconomicCalendar),
    safeRun('Earthquakes', fetchEarthquakes),
    safeRun('UNSC', fetchUNSC),
    safeRun('Cloudflare', fetchCloudflareOutages),
    safeRun('FIRMS', fetchFirmsHotspots),
    safeRun('Polymarket', fetchPolymarket),
  ]);

  // Phase 2: APIs with auth + heavier fetches
  await Promise.allSettled([
    safeRun('ACLED', fetchConflicts),
    safeRun('Macro', fetchMacro),
    safeRun('Border', fetchBorderStats),
    safeRun('Sanctions', fetchSanctions),
    safeRun('Shipping', fetchShippingData),
    safeRun('Congress', fetchCongress),
    safeRun('Flights', fetchFlights),
    safeRun('Twitter', fetchTwitterPrimary),
    safeRun('Cyber Threats', fetchCyberThreats),
  ]);

  // Phase 3: Composite and AI (depends on previous data)
  composeTicker();

  await Promise.allSettled([
    safeRun('AI Briefs (all desks)', generateAllBriefs),
    safeRun('Connections', fetchConnections),
    safeRun('Countries', fetchCountries),
    safeRun('Armed Groups', fetchArmedGroups),
    safeRun('Hostility', fetchHostilityIndex),
    safeRun('Alerts', analyzeAlerts),
  ]);

  // Phase 3.5: CII + Focal Points + Anomaly Detection + BQ services
  await Promise.allSettled([
    safeRun('BQ Country Tone', fetchCountryToneBQ),
    safeRun('Google Trends', fetchGoogleTrends),
    safeRun('CII', computeCII),
    safeRun('Focal Points', detectFocalPoints),
    safeRun('Anomaly Detection', runAnomalyDetection),
    safeRun('Geo Convergence', detectGeoConvergence),
    safeRun('Surge Detection', detectSurges),
  ]);

  // Phase 4: Slow AI analysis + ACLED-dependent services
  await Promise.allSettled([
    safeRun('Propaganda', fetchPropaganda),
    safeRun('Ukraine Front', fetchUkraineFront),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[WARMUP] Cache warmup completed in ${elapsed}s`);
}
