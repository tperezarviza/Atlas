import { fetchMarkets } from './markets.js';
import { fetchFeeds } from './feeds.js';
import { fetchGdeltNews } from './gdelt.js';
import { composeTicker } from './ticker.js';
import { fetchConflicts } from './acled.js';
import { fetchMacro } from './macro.js';
import { fetchCalendar } from './calendar.js';
import { generateAllBriefs } from './ai-brief.js';

import { fetchOoniIncidents } from './ooni.js';
import { fetchSanctions } from './sanctions.js';
import { fetchShippingData } from './shipping.js';
import { fetchCountries } from './countries.js';
import { fetchArmedGroups } from './terrorism.js';
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
// BQ services removed from warmup — too expensive (~180GB per redeploy).
// Data restored from Redis or arrives at next cron cycle.
import { detectSurges } from './surge-detection.js';
import { fetchXNews } from './x-news.js';
import { cache } from '../cache.js';
import { redisGet, waitForRedis } from '../redis.js';

async function safeRun(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[WARMUP] ${name} failed:`, err instanceof Error ? err.message : err);
  }
}

async function warmupFromRedis(): Promise<void> {
  console.log('[WARMUP] Waiting for Redis...');
  const ok = await waitForRedis(5000);
  if (!ok) {
    console.warn('[WARMUP] Redis not available, skipping restore');
    return;
  }
  console.log('[WARMUP] Loading Redis backups...');
  const keysToRestore = [
    'brief', 'brief:argentina', 'brief:emergency', 'brief:mideast', 'brief:ukraine', 'brief:domestic', 'brief:intel',
    'twitter', 'propaganda', 'hostility', 'focal_points',
    // BQ-derived caches — restored to avoid re-running expensive queries on redeploy
    'google_trends', 'bq_event_spikes', 'bq_military_cameo',
  ];
  let restored = 0;
  for (const key of keysToRestore) {
    const data = await redisGet(`cache:${key}`).catch(() => null);
    if (data !== null) {
      // BQ caches run every 6-12h, so bridge TTL must survive until next cron
      const bridgeTTL = key.startsWith('bq_') || key === 'google_trends' || key === 'hostility'
        ? 13 * 3600_000   // 13h bridge for long-interval services
        : 120_000;        // 2 min bridge for frequently-refreshed services
      cache.set(key, data, bridgeTTL);
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
    safeRun('Sanctions', fetchSanctions),
    safeRun('Shipping', fetchShippingData),
    safeRun('Congress', fetchCongress),
    safeRun('Flights', fetchFlights),
    safeRun('Twitter', fetchTwitterPrimary),
    safeRun('Cyber Threats', fetchCyberThreats),
    safeRun('X News', fetchXNews),
  ]);

  // Phase 3: Composite and AI (depends on previous data)
  await composeTicker();

  await Promise.allSettled([
    safeRun('AI Briefs (all desks)', generateAllBriefs),
    safeRun('Countries', fetchCountries),
    safeRun('Armed Groups', fetchArmedGroups),
    // Hostility skipped — BQ query costs 107GB. Restored from Redis or next cron (c/12h).
    safeRun('Alerts', analyzeAlerts),
  ]);

  // Phase 3.5: CII + Focal Points + non-BQ services
  // BQ queries skipped on warmup — they cost ~180GB ($1.12) per redeploy.
  // Data arrives at next cron cycle (4-12h). Hostility/focal restored from Redis above.
  await Promise.allSettled([
    safeRun('CII', computeCII),
    safeRun('Focal Points', detectFocalPoints),
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
