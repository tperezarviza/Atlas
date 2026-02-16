import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import type { CalendarEvent, CalendarUrgency } from '../types.js';

const parser = new RSSParser({ timeout: FETCH_TIMEOUT_RSS });

const CALENDAR_FEEDS = [
  { url: 'https://www.federalreserve.gov/feeds/press_monetary.xml', prefix: 'Fed' },
  { url: 'https://news.google.com/rss/search?q=when:7d+site:nato.int&ceid=US:en&hl=en-US&gl=US', prefix: 'NATO' },
  { url: 'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml', prefix: 'UN' },
];

function determineUrgency(dateStr: string): CalendarUrgency | 'past' {
  const now = new Date();
  const eventDate = new Date(dateStr);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return 'past';
  if (diffDays < 1) return 'today';
  if (diffDays <= 7) return 'soon';
  return 'future';
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
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

export async function fetchCalendar(): Promise<void> {
  console.log('[CALENDAR] Fetching calendar events...');

  try {
    const results = await Promise.allSettled(
      CALENDAR_FEEDS.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url);
          return (parsed.items ?? []).slice(0, 5).map((item, i) => ({
            id: `cal-${feed.prefix.toLowerCase()}-${i}`,
            date: formatEventDate(item.pubDate ?? item.isoDate ?? new Date().toISOString()),
            title: `${feed.prefix}: ${stripHTML(item.title ?? '')}`,
            detail: (item.contentSnippet ?? stripHTML(item.content ?? '')).trim().substring(0, 100),
            urgency: determineUrgency(item.pubDate ?? item.isoDate ?? new Date().toISOString()),
          }));
        } catch (err) {
          console.warn(`[CALENDAR] Feed ${feed.prefix} failed:`, err instanceof Error ? err.message : err);
          return [];
        }
      })
    );

    const events: CalendarEvent[] = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') events.push(...r.value);
    });

    // Drop events older than 7 days
    const filtered = events.filter(e => e.urgency !== 'past');

    if (filtered.length > 0) {
      // Sort: today first, then soon, then future
      const urgencyOrder: Record<CalendarUrgency, number> = { today: 0, soon: 1, future: 2 };
      filtered.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      cache.set('calendar', filtered, TTL.CALENDAR);
      console.log(`[CALENDAR] ${filtered.length} events cached (${events.length - filtered.length} past events dropped)`);
    } else {
      console.warn('[CALENDAR] No events found, keeping cache/mock');
    }
  } catch (err) {
    console.error('[CALENDAR] Fetch failed:', err);
  }
}
