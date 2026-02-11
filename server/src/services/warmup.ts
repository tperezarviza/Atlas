import { fetchMarkets } from './markets.js';
import { fetchFeeds } from './feeds.js';
import { fetchGdeltNews } from './gdelt.js';
import { composeTicker } from './ticker.js';
import { fetchConflicts } from './acled.js';
import { fetchMacro } from './macro.js';
import { fetchCalendar } from './calendar.js';
import { fetchBorderStats } from './border.js';
import { fetchBrief } from './ai-brief.js';
import { fetchConnections } from './connections.js';

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
  ]);

  // Phase 2: APIs with auth
  await Promise.allSettled([
    safeRun('ACLED', fetchConflicts),
    safeRun('Macro', fetchMacro),
    safeRun('Border', fetchBorderStats),
  ]);

  // Phase 3: Composite and AI (depends on previous data)
  composeTicker();

  await Promise.allSettled([
    safeRun('AI Brief', async () => { await fetchBrief(); }),
    safeRun('Connections', fetchConnections),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[WARMUP] Cache warmup completed in ${elapsed}s`);
}
