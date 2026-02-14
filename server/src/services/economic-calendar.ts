import * as cheerio from 'cheerio';
import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { EconomicEvent, EconImpact } from '../types.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function parseImpact(el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): EconImpact {
  const cls = el.attr('class') || '';
  const title = el.attr('title') || '';
  if (/high|red/i.test(cls + title)) return 'high';
  if (/medium|orange|moderate/i.test(cls + title)) return 'medium';
  return 'low';
}

async function scrapeForexFactory(week: string): Promise<EconomicEvent[]> {
  try {
    const url = `https://www.forexfactory.com/calendar?week=${week}`;
    const res = await fetch(url, {
      headers: { ...HEADERS, Cookie: 'ffcalendar_timezone=America/New_York' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const events: EconomicEvent[] = [];
    let currentDate = '';

    $('tr.calendar__row').each((_, row) => {
      const dateCell = $(row).find('td.calendar__date span');
      if (dateCell.length && dateCell.text().trim()) {
        currentDate = dateCell.text().trim();
      }

      const timeCell = $(row).find('td.calendar__time').text().trim();
      const currency = $(row).find('td.calendar__currency').text().trim();
      const impactEl = $(row).find('td.calendar__impact span');
      const eventName = $(row).find('td.calendar__event span').text().trim();
      const actual = $(row).find('td.calendar__actual span').text().trim() || undefined;
      const forecast = $(row).find('td.calendar__forecast span').text().trim() || undefined;
      const previous = $(row).find('td.calendar__previous span').text().trim() || undefined;

      if (!eventName || !currency) return;

      const impact = parseImpact(impactEl, $);

      // Filter: all high-impact + USD medium; reject low for all, medium for non-USD
      if (impact === 'low') return;
      if (impact === 'medium' && currency !== 'USD') return;

      events.push({
        date: currentDate,
        time: timeCell || 'All Day',
        currency,
        impact,
        event_name: eventName,
        actual,
        forecast,
        previous,
      });
    });

    return events;
  } catch {
    return [];
  }
}

// Fallback: Investing.com economic calendar API (JSON)
async function fetchInvestingCalendar(): Promise<EconomicEvent[]> {
  try {
    const url = `https://nfs.faireconomy.media/ff_calendar_thisweek.json`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return [];

    const data = await res.json() as any[];
    if (!Array.isArray(data)) return [];

    return data
      .map((e: any) => ({
        date: e.date || '',
        time: e.time || 'All Day',
        currency: e.country || '',
        impact: (e.impact === 'High' ? 'high' : e.impact === 'Medium' ? 'medium' : 'low') as EconImpact,
        event_name: e.title || '',
        actual: e.actual || undefined,
        forecast: e.forecast || undefined,
        previous: e.previous || undefined,
      }))
      .filter((e: EconomicEvent) => {
        if (e.impact === 'high') return true;
        if (e.currency === 'USD' && e.impact === 'medium') return true;
        return false;
      });
  } catch {
    return [];
  }
}

export async function fetchEconomicCalendar(): Promise<void> {
  if (cache.isFresh('economic_calendar')) return;
  console.log('[ECON] Fetching economic calendar...');

  try {
    // Try ForexFactory first, then fallback
    let events = await scrapeForexFactory('this');
    let usedFallback = false;

    if (events.length === 0) {
      console.log('[ECON] ForexFactory scrape empty, trying fallback...');
      events = await fetchInvestingCalendar();
      usedFallback = true;
    }

    // Also fetch next week from ForexFactory (skip if primary scrape already failed)
    if (!usedFallback) {
      const nextWeekEvents = await scrapeForexFactory('next');
      events = [...events, ...nextWeekEvents];
    }

    cache.set('economic_calendar', events, TTL.ECON_CALENDAR);
    console.log(`[ECON] Cached ${events.length} economic events`);
  } catch (err) {
    console.error('[ECON] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
