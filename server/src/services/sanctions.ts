import { cache } from '../cache.js';
import { TTL } from '../config.js';

export interface OFACSanction {
  id: string;
  title: string;
  date: string;
  program: string;
  url: string;
  summary: string;
}

export async function fetchSanctions(): Promise<void> {
  if (cache.isFresh('ofac_sanctions')) return;

  console.log('[OFAC] Fetching sanctions data...');
  try {
    // OFAC retired their RSS feed Jan 2025. Scrape HTML page instead.
    const res = await fetch(
      'https://ofac.treasury.gov/recent-actions',
      {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
      }
    );

    if (!res.ok) throw new Error(`OFAC HTTP ${res.status}`);
    const html = await res.text();

    const items: OFACSanction[] = [];
    const entryRegex = /<a\s+href="(\/recent-actions\/\d{8}[^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/g;

    let match;
    let idx = 0;
    while ((match = entryRegex.exec(html)) !== null && idx < 50) {
      const path = match[1];
      const rawTitle = match[2].replace(/<[^>]*>/g, '').trim();
      if (!rawTitle || rawTitle.length < 5) continue;

      // Extract date from path (format: /recent-actions/YYYYMMDD)
      const dateMatch = path.match(/\/(\d{4})(\d{2})(\d{2})/);
      const isoDate = dateMatch
        ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
        : new Date().toISOString().split('T')[0];

      items.push({
        id: `ofac-${idx}`,
        title: decodeHtmlEntities(rawTitle),
        date: new Date(isoDate).toISOString(),
        program: extractProgram(rawTitle),
        url: `https://ofac.treasury.gov${path}`,
        summary: '',
      });
      idx++;
    }

    if (items.length > 0) {
      cache.set('ofac_sanctions', items, TTL.CALENDAR);
      console.log(`[OFAC] ${items.length} recent sanctions cached`);
    } else {
      console.warn('[OFAC] No items parsed from HTML page');
    }
  } catch (err) {
    console.error('[OFAC] Fetch failed:', err);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '');
}

function extractProgram(title: string): string {
  const programs = ['SDGT', 'SDN', 'IRAN', 'RUSSIA', 'CUBA', 'DPRK', 'SYRIA', 'VENEZUELA', 'CYBER', 'YEMEN', 'BALKANS', 'NICARAGUA', 'MALI', 'SOMALIA', 'LIBYA'];
  const upper = title.toUpperCase();
  for (const p of programs) {
    if (upper.includes(p)) return p;
  }
  return 'GENERAL';
}
