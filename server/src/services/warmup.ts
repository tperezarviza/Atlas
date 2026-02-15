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
import { fetchTwitterPrimary } from './twitter.js';
import { fetchCyberThreats } from './cyber.js';
import { fetchNaturalEvents } from './eonet.js';
import { fetchEconomicCalendar } from './economic-calendar.js';
import { analyzeAlerts } from './alerts.js';
import { fetchEarthquakes } from './earthquakes.js';
import { fetchUNSC } from './unsc.js';
import { fetchCloudflareOutages } from './cloudflare-radar.js';
import { fetchFirmsHotspots } from './firms.js';
import { fetchPolymarket } from './polymarket.js';
import { computeCII } from './cii.js';

async function safeRun(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[WARMUP] ${name} failed:`, err instanceof Error ? err.message : err);
  }
}

export async function warmUpCache(): Promise<void> {
  console.log('[WARMUP] Starting cache warmup...');
  const start = Date.now();

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

  // Phase 3.5: CII depends on news, conflicts, ooni, flights, hostility
  await safeRun('CII', computeCII);

  // Phase 4: Slow AI analysis + ACLED-dependent services
  await Promise.allSettled([
    safeRun('Propaganda', fetchPropaganda),
    safeRun('Ukraine Front', fetchUkraineFront),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[WARMUP] Cache warmup completed in ${elapsed}s`);
}
