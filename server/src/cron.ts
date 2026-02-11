import cron from 'node-cron';
import { fetchMarkets } from './services/markets.js';
import { fetchFeeds } from './services/feeds.js';
import { fetchGdeltNews } from './services/gdelt.js';
import { composeTicker } from './services/ticker.js';
import { fetchConflicts } from './services/acled.js';
import { fetchMacro } from './services/macro.js';
import { fetchBrief } from './services/ai-brief.js';
import { fetchConnections } from './services/connections.js';
import { fetchCalendar } from './services/calendar.js';
import { fetchBorderStats } from './services/border.js';
import { fetchCDS } from './services/cds.js';
import { fetchOoniIncidents } from './services/ooni.js';
import { fetchCountries } from './services/countries.js';
import { fetchArmedGroups } from './services/terrorism.js';
import { fetchShippingData } from './services/shipping.js';
import { fetchHostilityIndex } from './services/hostility.js';
import { fetchPropaganda } from './services/propaganda.js';
import { fetchSanctions } from './services/sanctions.js';

function safeRun(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[CRON] ${name} failed:`, err);
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

  // 0 */4 * * * -> AI Brief + AI Connections
  cron.schedule('0 */4 * * *', safeRun('ai', async () => {
    await fetchBrief().catch((e) => console.error('[CRON] Brief failed:', e));
    await fetchConnections();
  }));

  // 0 */12 * * * -> Calendar
  cron.schedule('0 */12 * * *', safeRun('calendar', fetchCalendar));

  // 0 6 * * * -> Border stats (1x/day)
  cron.schedule('0 6 * * *', safeRun('border', fetchBorderStats));

  // 0 */6 * * * -> CDS spreads + Hostility Index
  cron.schedule('0 */6 * * *', safeRun('cds+hostility', async () => {
    await fetchCDS();
    await fetchHostilityIndex();
  }));

  // 0 * * * * (offset 30) -> OONI + Countries + Armed Groups
  cron.schedule('30 * * * *', safeRun('intel', async () => {
    await fetchOoniIncidents();
    await fetchCountries();
    await fetchArmedGroups();
  }));

  // 15,45 * * * * -> Shipping (every 30 min offset)
  cron.schedule('15,45 * * * *', safeRun('shipping', fetchShippingData));

  // 0 */12 * * * -> Propaganda (every 12h)
  cron.schedule('30 */12 * * *', safeRun('propaganda', fetchPropaganda));

  // 0 3 * * * -> Sanctions (daily 3am)
  cron.schedule('0 3 * * *', safeRun('sanctions', fetchSanctions));

  console.log('[CRON] All jobs scheduled');
}
