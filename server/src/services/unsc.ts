import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { CalendarEvent, CalendarUrgency } from '../types.js';

export async function fetchUNSC(): Promise<void> {
  console.log('[UNSC] Fetching Security Council calendar...');
  try {
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

    const allEvents: (CalendarEvent & { _urgency: CalendarUrgency | 'past' })[] = [];
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

      const urgency = getUrgency(d);
      allEvents.push({
        id: `unsc-${idx++}`,
        date: formatEventDate(d),
        title: `UNSC: ${title.slice(0, 120)}`,
        detail: title,
        urgency: urgency === 'past' ? 'today' : urgency, // placeholder for type
        _urgency: urgency,
      });
    }

    // Filter out events older than 7 days
    const events: CalendarEvent[] = allEvents
      .filter(e => e._urgency !== 'past')
      .map(({ _urgency, ...rest }) => ({ ...rest, urgency: _urgency as CalendarUrgency }));

    if (events.length > 0) {
      cache.set('unsc_calendar', events, TTL.CALENDAR);
      console.log(`[UNSC] ${events.length} SC press items cached (${allEvents.length - events.length} past dropped)`);
    } else {
      console.log('[UNSC] No recent SC items found in RSS feed');
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

function getUrgency(eventDate: Date): CalendarUrgency | 'past' {
  const diffMs = eventDate.getTime() - Date.now();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < -7) return 'past';
  if (diffDays < 1) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'future';
}

function formatEventDate(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.floor(diffMs / 86400000);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (diffDays < -1) {
    const daysAgo = Math.abs(diffDays);
    return daysAgo <= 7 ? `${daysAgo}d ago · ${formatted}` : formatted;
  }
  if (diffDays < 1) return `TODAY · ${formatted}`;
  if (diffDays === 1) return `TOMORROW · ${formatted}`;
  if (diffDays <= 7) return `In ${diffDays}d · ${formatted}`;
  return formatted;
}
