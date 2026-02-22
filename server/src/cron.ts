import cron from 'node-cron';
import { sanitizeError } from './config.js';
import { redisKeys } from './redis.js';
import { fetchMarkets } from './services/markets.js';
import { fetchFeeds } from './services/feeds.js';
import { fetchGdeltNews } from './services/gdelt.js';
import { composeTicker } from './services/ticker.js';
import { fetchConflicts } from './services/acled.js';
import { fetchMacro } from './services/macro.js';
import { generateAllBriefs, generateSurgeBrief } from './services/ai-brief.js';
import { cache } from './cache.js';

import { fetchCalendar } from './services/calendar.js';

import { fetchOoniIncidents } from './services/ooni.js';
import { fetchCountries } from './services/countries.js';
import { fetchArmedGroups } from './services/terrorism.js';
import { fetchShippingData } from './services/shipping.js';
import { fetchHostilityIndex } from './services/hostility.js';
import { fetchPropaganda } from './services/propaganda.js';
import { fetchSanctions } from './services/sanctions.js';
import { fetchCongress } from './services/congress.js';
import { fetchExecutiveOrders } from './services/executive-orders.js';
import { fetchFlights } from './services/flights.js';
import { fetchUkraineFront } from './services/ukraine-front.js';
import { fetchTwitterTiered } from './services/twitter.js';
import { fetchCyberThreats } from './services/cyber.js';
import { fetchNaturalEvents } from './services/eonet.js';
import { fetchEconomicCalendar } from './services/economic-calendar.js';
import { analyzeAlerts } from './services/alerts.js';
import { fetchEarthquakes } from './services/earthquakes.js';
import { fetchUNSC } from './services/unsc.js';
import { fetchCloudflareOutages } from './services/cloudflare-radar.js';
import { fetchFirmsHotspots } from './services/firms.js';
import { fetchPolymarket } from './services/polymarket.js';
import { computeCII } from './services/cii.js';
import { detectFocalPoints } from './services/focal-points.js';
import { flushDailyBytes } from './services/bq-cost-tracker.js';
import { fetchGoogleTrends } from './services/google-trends-bq.js';
import { detectSurges } from './services/surge-detection.js';
import { fetchEventSpikes, fetchMilitaryCameo } from './services/bq-events.js';
import { fetchXNews } from './services/x-news.js';

const running = new Set<string>();

function safeRun(name: string, fn: () => Promise<void> | void) {
  return async () => {
    if (running.has(name)) {
      console.log(`[CRON] ${name} skipped (still running)`);
      return;
    }
    running.add(name);
    try {
      await fn();
    } catch (err) {
      console.error(`[CRON] ${name} failed:`, sanitizeError(err));
    } finally {
      running.delete(name);
    }
  };
}

export function startCronJobs() {
  console.log('[CRON] Starting scheduled jobs...');

  // */5 * * * * -> Markets (crypto, indices, forex — smart refresh)
  cron.schedule('*/5 * * * *', safeRun('markets', fetchMarkets));

  // */3 * * * * -> RSS Leader Feed
  cron.schedule('*/3 * * * *', safeRun('feeds', fetchFeeds));

  // */15 * * * * -> GDELT News + X News + Ticker recomposite
  cron.schedule('*/15 * * * *', safeRun('gdelt+xnews+ticker', async () => {
    await fetchGdeltNews();
    await fetchXNews();
    await composeTicker();
  }));

  // 0 * * * * -> ACLED Conflicts + Macro data
  cron.schedule('0 * * * *', safeRun('conflicts+macro', async () => {
    await fetchConflicts();
    await fetchMacro();
  }));

  // 0 8,18 * * * -> AI Briefs (morning + afternoon, all 5 desks)
  cron.schedule('0 8,18 * * *', safeRun('ai-briefs', generateAllBriefs));

  // 0 */12 * * * -> Calendar
  cron.schedule('0 */12 * * *', safeRun('calendar', fetchCalendar));

  // 30 */6 * * * -> UNSC Security Council calendar (every 6h)
  cron.schedule('30 */6 * * *', safeRun('unsc', fetchUNSC));

  // 0 */12 * * * -> Hostility Index (GDELT API, 2x/day)
  cron.schedule('0 */12 * * *', safeRun('hostility', fetchHostilityIndex));

  // 0 * * * * (offset 30) -> OONI + Countries + Armed Groups
  cron.schedule('30 * * * *', safeRun('intel', async () => {
    await fetchOoniIncidents();
    await fetchCountries();
    await fetchArmedGroups();
  }));

  // 15,45 * * * * -> Shipping (every 30 min offset)
  cron.schedule('15,45 * * * *', safeRun('shipping', fetchShippingData));

  // 0 7,15,23 * * * -> Propaganda (3x/day)
  cron.schedule('0 7,15,23 * * *', safeRun('propaganda', fetchPropaganda));

  // 0 3 * * * -> Sanctions (daily 3am)
  cron.schedule('0 3 * * *', safeRun('sanctions', fetchSanctions));

  // */5 * * * * -> Military flights (every 5 min via ADSB Exchange)
  cron.schedule('*/5 * * * *', safeRun('flights', fetchFlights));

  // 10 * * * * -> Ukraine front (every hour, offset 10)
  cron.schedule('10 * * * *', safeRun('ukraine-front', fetchUkraineFront));

  // 20 */2 * * * -> Congress bills + nominations (every 2h)
  cron.schedule('20 */2 * * *', safeRun('congress', fetchCongress));

  // 50 */12 * * * -> Executive orders (every 12h)
  cron.schedule('50 */12 * * *', safeRun('executive-orders', fetchExecutiveOrders));

  // */5 * * * * -> Twitter tiered monitoring (A=every 5m, B=every 10m, C=every 20m)
  cron.schedule('*/5 * * * *', safeRun('twitter', fetchTwitterTiered));

  // 25 * * * * -> Cyber threats OTX (every hour, offset 25)
  cron.schedule('25 * * * *', safeRun('cyber-threats', fetchCyberThreats));

  // */30 * * * * -> NASA EONET natural events (every 30 min)
  cron.schedule('10,40 * * * *', safeRun('eonet', fetchNaturalEvents));

  // 0 */4 * * * -> Economic calendar (every 4h)
  cron.schedule('45 */4 * * *', safeRun('econ-calendar', fetchEconomicCalendar));

  // 0,30 * * * * -> USGS Earthquakes (every 30 min)
  cron.schedule('0,30 * * * *', safeRun('earthquakes', fetchEarthquakes));

  // */15 * * * * -> Cloudflare Radar outages (every 15 min, offset 5)
  cron.schedule('5,20,35,50 * * * *', safeRun('cloudflare', fetchCloudflareOutages));

  // 5,35 * * * * -> NASA FIRMS hotspots (every 30 min, offset 5)
  cron.schedule('5,35 * * * *', safeRun('firms', fetchFirmsHotspots));

  // */5 * * * * -> Polymarket prediction markets (every 5 min)
  cron.schedule('2,7,12,17,22,27,32,37,42,47,52,57 * * * *', safeRun('polymarket', fetchPolymarket));

  // 20,50 * * * * -> Country Instability Index (every 30 min, offset 20)
  cron.schedule('20,50 * * * *', safeRun('cii', computeCII));

  // 7 */6 * * * -> Focal Point Detection (BQ GKG entities or Claude NER fallback)
  cron.schedule('7 * * * *', safeRun('focal-points', detectFocalPoints));


  // 30 6 * * * -> Google Trends (BQ, 1x/day at 6:30 UTC — BQ data updates daily)
  cron.schedule('30 6 * * *', safeRun('google-trends', fetchGoogleTrends));

  // 15 */6 * * * -> BQ event spike + military CAMEO analysis
  cron.schedule('15 */6 * * *', safeRun('bq-events', async () => {
    await fetchEventSpikes();
    await fetchMilitaryCameo();
  }));

  // 0 * * * * -> Flush BQ cost tracking bytes to Redis (hourly)
  cron.schedule('0 * * * *', safeRun('bq-cost-flush', flushDailyBytes));

  // 8,23,38,53 * * * * -> Surge detection (every 15 min, offset 8)
  cron.schedule('8,23,38,53 * * * *', safeRun('surge-detection', detectSurges));

  // * * * * * -> Alerts analysis (every minute)
  cron.schedule('* * * * *', safeRun('alerts', analyzeAlerts));

  // 3,8,13,18,23,28,33,38,43,48,53,58 * * * * -> Twitter trending surge check (every 5 min)
  let prevTrendingCounts: Record<string, number> = {};
  cron.schedule('3,8,13,18,23,28,33,38,43,48,53,58 * * * *', safeRun('twitter-surge', async () => {
    const trending = cache.get<{ keyword: string; count: number }[]>('twitter_trending');
    if (!trending || trending.length === 0) return;

    const current: Record<string, number> = {};
    for (const t of trending) current[t.keyword] = t.count;

    // Detect surge: keyword jumps >200% or new keyword with count ≥ 10
    for (const [kw, count] of Object.entries(current)) {
      const prev = prevTrendingCounts[kw] ?? 0;
      const isSurge = (prev > 0 && count / prev > 3) || (prev === 0 && count >= 10);
      if (isSurge) {
        console.log(`[SURGE] Detected surge: ${kw} ×${count} (was ${prev})`);
        await generateSurgeBrief(kw);
        break; // Only one surge brief per check
      }
    }

    prevTrendingCounts = current;
  }));

  // Daily 4am: Redis key count monitoring
  cron.schedule('0 4 * * *', safeRun('redis-monitor', async () => {
    const keys = await redisKeys('*');
    console.log(`[REDIS] Key count: ${keys.length} (cache:* = ${keys.filter(k => k.startsWith('cache:')).length}, state:* = ${keys.filter(k => k.startsWith('state:')).length})`);
  }));

  console.log('[CRON] All jobs scheduled');
}
