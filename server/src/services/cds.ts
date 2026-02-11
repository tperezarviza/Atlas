import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { mockCDS } from '../mock/globalMarkets.js';
import type { CDSSpread } from '../types.js';

/**
 * CDS spread data.
 * worldgovernmentbonds.com renders via JavaScript (no static HTML),
 * so we use curated mock data as the primary source.
 * This function caches mock CDS data and can be extended with
 * a headless browser or alternative API source in the future.
 */
export async function fetchCDS(): Promise<void> {
  console.log('[CDS] Loading sovereign CDS spreads...');

  try {
    // Future: integrate headless browser or alternative CDS API
    // For now, use curated mock data (realistic values updated periodically)
    const spreads: CDSSpread[] = mockCDS;

    cache.set('cds', spreads, TTL.CDS);
    console.log(`[CDS] ${spreads.length} CDS spreads cached`);
  } catch (err) {
    console.error('[CDS] Failed:', err instanceof Error ? err.message : err);
  }
}
