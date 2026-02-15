import cron from 'node-cron';
import { sanitizeError } from './config.js';
import { redisKeys } from './redis.js';
import { fetchMarkets } from './services/markets.js';
import { fetchFeeds } from './services/feeds.js';
import { fetchGdeltNews } from './services/gdelt.js';
import { composeTicker } from './services/ticker.js';
import { fetchConflicts } from './services/acled.js';
import { fetchMacro } from './services/macro.js';
import { generateAllBriefs } from './services/ai-brief.js';

import { fetchCalendar } from './services/calendar.js';
import { fetchBorderStats } from './services/border.js';
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
import { runAnomalyDetection } from './services/anomaly-detector.js';
import { fetchCountryToneBQ } from './services/cii-bq.js';
import { detectGeoConvergence } from './services/geo-convergence.js';
import { flushDailyBytes } from './services/bq-cost-tracker.js';
import { fetchGoogleTrends } from './services/google-trends-bq.js';
import { detectSurges } from './services/surge-detection.js';

function safeRun(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[CRON] ${name} failed:`, sanitizeError(err));
    }
  };
}

export function startCronJobs() {
  console.log('[CRON] Starting scheduled jobs...');

  // */5 * * * * -> Markets (crypto, indices, forex — smart refresh)
  cron.schedule('*/5 * * * *', safeRun('markets', fetchMarkets));

  // */3 * * * * -> RSS Leader Feed
  cron.schedule('*/3 * * * *', safeRun('feeds', fetchFeeds));

  // */15 * * * * -> GDELT News + Ticker recomposite
  cron.schedule('*/15 * * * *', safeRun('gdelt+ticker', async () => {
    await fetchGdeltNews();
    composeTicker();
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

  // 0 6 * * * -> Border stats (1x/day)
  cron.schedule('0 6 * * *', safeRun('border', fetchBorderStats));

  // 0 */4 * * * -> Hostility Index (BQ: all 15 pairs in one query)
  cron.schedule('0 */4 * * *', safeRun('hostility', fetchHostilityIndex));

  // 0 * * * * (offset 30) -> OONI + Countries + Armed Groups
  cron.schedule('30 * * * *', safeRun('intel', async () => {
    await fetchOoniIncidents();
    await fetchCountries();
    await fetchArmedGroups();
  }));

  // 15,45 * * * * -> Shipping (every 30 min offset)
  cron.schedule('15,45 * * * *', safeRun('shipping', fetchShippingData));

  // 0 7 * * * -> Propaganda (1x/day at 7am)
  cron.schedule('0 7 * * *', safeRun('propaganda', fetchPropaganda));

  // 0 3 * * * -> Sanctions (daily 3am)
  cron.schedule('0 3 * * *', safeRun('sanctions', fetchSanctions));

  // */2 * * * * -> Military flights (every 2 min)
  cron.schedule('*/2 * * * *', safeRun('flights', fetchFlights));

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
  cron.schedule('7 */6 * * *', safeRun('focal-points', detectFocalPoints));

  // 12,27,42,57 * * * * -> Anomaly Detection (every 15 min, offset 12)
  cron.schedule('12,27,42,57 * * * *', safeRun('anomaly-detection', runAnomalyDetection));

  // 10,40 * * * * -> Country tone for CII (BQ, every 30 min)
  cron.schedule('10,40 * * * *', safeRun('cii-bq-tone', fetchCountryToneBQ));

  // 15,45 * * * * -> Geographic convergence detection (BQ, every 30 min)
  cron.schedule('15,45 * * * *', safeRun('geo-convergence', detectGeoConvergence));

  // 0 */6 * * * -> Google Trends (BQ, 4x/day — data updates daily)
  cron.schedule('0 */6 * * *', safeRun('google-trends', fetchGoogleTrends));

  // 0 * * * * -> Flush BQ cost tracking bytes to Redis (hourly)
  cron.schedule('0 * * * *', safeRun('bq-cost-flush', flushDailyBytes));

  // 8,23,38,53 * * * * -> Surge detection (every 15 min, offset 8)
  cron.schedule('8,23,38,53 * * * *', safeRun('surge-detection', detectSurges));

  // * * * * * -> Alerts analysis (every minute)
  cron.schedule('* * * * *', safeRun('alerts', analyzeAlerts));

  // Daily 4am: Redis key count monitoring
  cron.schedule('0 4 * * *', safeRun('redis-monitor', async () => {
    const keys = await redisKeys('*');
    console.log(`[REDIS] Key count: ${keys.length} (cache:* = ${keys.filter(k => k.startsWith('cache:')).length}, state:* = ${keys.filter(k => k.startsWith('state:')).length})`);
  }));

  console.log('[CRON] All jobs scheduled');
}
