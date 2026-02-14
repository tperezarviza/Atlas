import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { CalendarEvent } from '../types.js';

export async function fetchUNSC(): Promise<void> {
  console.log('[UNSC] Fetching Security Council calendar...');
  try {
    // Primary: press.un.org RSS filtered for Security Council items
    const res = await fetch(
      'https://press.un.org/en/rss.xml',
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }
    );

    if (!res.ok) throw new Error(`Press UN HTTP ${res.status}`);
    const xml = await res.text();

    const events: CalendarEvent[] = [];
    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
    let idx = 0;

    for (const item of items) {
      const title = extractTag(item, 'title');
      const pubDate = extractTag(item, 'pubDate');
      const link = extractTag(item, 'link');

      // Filter: only Security Council items
      const isSC = /\bSecurity Council\b/i.test(title) || /\bsc\/?\d/i.test(link) || /\bSC\b/.test(title);
      if (!isSC) continue;

      const d = new Date(pubDate);
      if (isNaN(d.getTime())) continue;
      const dateStr = d.toISOString().split('T')[0];

      events.push({
        id: `unsc-${idx++}`,
        date: dateStr,
        title: `UNSC: ${title.slice(0, 120)}`,
        detail: title,
        urgency: getUrgency(dateStr),
      });
    }

    if (events.length > 0) {
      cache.set('unsc_calendar', events, TTL.CALENDAR);
      console.log(`[UNSC] ${events.length} SC press items cached`);
    } else {
      console.log('[UNSC] No SC items found in RSS feed');
    }
  } catch (err) {
    console.error('[UNSC] Fetch failed:', err);
  }
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(regex);
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
}

function getUrgency(dateStr: string): 'today' | 'soon' | 'future' {
  const now = new Date();
  const d = new Date(dateStr);
  const diffDays = (d.getTime() - now.getTime()) / 86400000;
  if (diffDays <= 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'future';
}
