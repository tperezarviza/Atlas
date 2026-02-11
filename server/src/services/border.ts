import * as cheerio from 'cheerio';
import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { BorderStat } from '../types.js';

const BORDER_URLS = [
  'https://www.cbp.gov/newsroom/stats/southwest-land-border-encounters',
  'https://www.cbp.gov/newsroom/stats/nationwide-encounters',
];

/** Try multiple CSS selector strategies — CBP redesigns frequently */
function extractFromHTML(html: string): BorderStat[] {
  const $ = cheerio.load(html);
  const stats: BorderStat[] = [];

  // Strategy 1: Standard table rows
  const tables = $('table');
  for (let t = 0; t < Math.min(tables.length, 3); t++) {
    const rows = $(tables[t]).find('tr');
    rows.each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (label && value && /\d/.test(value)) {
          stats.push({ label, value });
        }
      }
    });
  }

  // Strategy 2: Definition-list or key-value pairs (dl/dt/dd)
  if (stats.length === 0) {
    $('dl').each((_, dl) => {
      const dts = $(dl).find('dt');
      const dds = $(dl).find('dd');
      dts.each((i, dt) => {
        const label = $(dt).text().trim();
        const value = $(dds.eq(i)).text().trim();
        if (label && value) stats.push({ label, value });
      });
    });
  }

  // Strategy 3: Look for stat blocks (common gov pattern: heading + number)
  if (stats.length === 0) {
    $('[class*="stat"], [class*="metric"], [class*="number"], [class*="figure"]').each((_, el) => {
      const text = $(el).text().trim();
      const numberMatch = text.match(/([\d,]+)/);
      if (numberMatch) {
        const parent = $(el).parent();
        const label = parent.find('h3, h4, h5, span, p').first().text().trim() || 'Encounters';
        stats.push({ label, value: numberMatch[1] });
      }
    });
  }

  // Strategy 4: JSON-LD structured data
  if (stats.length === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json.mainEntity?.acceptedAnswer?.text) {
          stats.push({ label: json.name || 'Data', value: json.mainEntity.acceptedAnswer.text });
        }
      } catch { /* skip malformed JSON-LD */ }
    });
  }

  return stats;
}

export async function fetchBorderStats(): Promise<void> {
  console.log('[BORDER] Fetching CBP border stats...');

  for (const url of BORDER_URLS) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!res.ok) {
        console.warn(`[BORDER] ${url} returned ${res.status}`);
        continue;
      }

      const html = await res.text();
      const stats = extractFromHTML(html);

      if (stats.length > 0) {
        cache.set('border', stats, TTL.BORDER);
        console.log(`[BORDER] ${stats.length} border stats cached from ${url}`);
        return;
      }

      console.warn(`[BORDER] Could not parse data from ${url}, trying next...`);
    } catch (err) {
      console.warn(`[BORDER] Failed to fetch ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  console.warn('[BORDER] All sources failed, keeping cache/mock');
}
