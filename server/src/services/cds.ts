import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { CDSSpread } from '../types.js';

/**
 * CDS spread data scraped from worldgovernmentbonds.com.
 * The site renders via JS, so we parse the JSON embedded in the page source.
 */
export async function fetchCDS(): Promise<void> {
  console.log('[CDS] Fetching sovereign CDS spreads...');

  try {
    const url = 'https://www.worldgovernmentbonds.com/cds-historical-data/';
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATLAS/1.0)' },
    });

    if (!res.ok) {
      console.warn(`[CDS] HTTP ${res.status}`);
      return;
    }

    const html = await res.text();

    // The page embeds CDS data in a JavaScript variable or table rows
    // Try to extract from the HTML table
    const spreads: CDSSpread[] = [];
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>.*?<a[^>]*>([^<]+)<\/a>.*?<\/td>\s*<td[^>]*>([\d.]+)<\/td>/gs;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const country = match[1].trim();
      const spread = parseFloat(match[2]);
      if (country && spread > 0) {
        spreads.push({
          country,
          code: country.slice(0, 2).toUpperCase(),
          spread5Y: Math.round(spread),
          change: 0,
          direction: 'flat',
          rating: '—',
        });
      }
    }

    if (spreads.length > 0) {
      cache.set('cds', spreads, TTL.CDS);
      console.log(`[CDS] ${spreads.length} CDS spreads cached`);
    } else {
      console.warn('[CDS] No spreads parsed from page');
    }
  } catch (err) {
    console.error('[CDS] Failed:', err instanceof Error ? err.message : err);
  }
}
