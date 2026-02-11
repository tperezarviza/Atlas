import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import type { CalendarEvent, CalendarUrgency } from '../types.js';

const parser = new RSSParser({ timeout: FETCH_TIMEOUT_RSS });

const CALENDAR_FEEDS = [
  { url: 'https://www.federalreserve.gov/feeds/press_monetary.xml', prefix: 'Fed' },
  { url: 'https://www.nato.int/cps/en/natohq/events.rss', prefix: 'NATO' },
  { url: 'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml', prefix: 'UN' },
];

function determineUrgency(dateStr: string): CalendarUrgency {
  const now = new Date();
  const eventDate = new Date(dateStr);
  const diffDays = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'today';
  if (diffDays <= 7) return 'soon';
  return 'future';
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return `TODAY · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    if (events.length > 0) {
      // Sort: today first, then soon, then future
      const urgencyOrder: Record<CalendarUrgency, number> = { today: 0, soon: 1, future: 2 };
      events.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      cache.set('calendar', events, TTL.CALENDAR);
      console.log(`[CALENDAR] ${events.length} events cached`);
    } else {
      console.warn('[CALENDAR] No events found, keeping cache/mock');
    }
  } catch (err) {
    console.error('[CALENDAR] Fetch failed:', err);
  }
}
