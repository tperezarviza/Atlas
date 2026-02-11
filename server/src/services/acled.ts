import { ACLED_API_KEY, ACLED_EMAIL, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { Conflict, Severity, Trend } from '../types.js';

interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  latitude: string;
  longitude: string;
  fatalities: string;
  notes: string;
}

interface CountryAgg {
  country: string;
  events: number;
  fatalities: number;
  lat: number;
  lng: number;
  latestEvent: string;
  actors: Set<string>;
  eventsLast7d: number;
  eventsPrev7d: number;
}

function determineSeverity(events: number, fatalities: number): Severity {
  if (fatalities > 1000 || events > 500) return 'critical';
  if (fatalities > 200 || events > 100) return 'high';
  if (fatalities > 50 || events > 30) return 'medium';
  return 'low';
}

function determineTrend(last7d: number, prev7d: number): Trend {
  if (prev7d === 0) return last7d > 0 ? 'escalating' : 'stable';
  const ratio = last7d / prev7d;
  if (ratio > 1.25) return 'escalating';
  if (ratio < 0.75) return 'de-escalating';
  return 'stable';
}

function countryToRegion(country: string): string {
  const regionMap: Record<string, string> = {
    'Ukraine': 'E. Europe', 'Russia': 'E. Europe',
    'Israel': 'Middle East', 'Palestine': 'Middle East', 'Syria': 'Middle East',
    'Yemen': 'Middle East', 'Iran': 'Middle East', 'Iraq': 'Middle East', 'Lebanon': 'Middle East',
    'Sudan': 'E. Africa', 'Somalia': 'E. Africa', 'Ethiopia': 'E. Africa',
    'Democratic Republic of Congo': 'Central Africa',
    'Myanmar': 'SE Asia',
    'Mali': 'W. Africa', 'Burkina Faso': 'W. Africa', 'Niger': 'W. Africa', 'Nigeria': 'W. Africa',
    'Mexico': 'N. America',
    'Colombia': 'S. America',
    'Haiti': 'Caribbean',
    'Pakistan': 'S. Asia', 'Afghanistan': 'S. Asia', 'India': 'S. Asia',
    'Libya': 'N. Africa',
    'China': 'E. Asia',
    'Philippines': 'SE Asia',
  };
  return regionMap[country] ?? 'Other';
}

export async function fetchConflicts(): Promise<void> {
  if (!ACLED_API_KEY || !ACLED_EMAIL) {
    console.warn('[ACLED] No API key/email configured, skipping');
    return;
  }

  console.log('[ACLED] Fetching conflict data...');

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const url = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(ACLED_API_KEY)}&email=${encodeURIComponent(ACLED_EMAIL)}&event_date=${thirtyDaysAgo}|${new Date().toISOString().split('T')[0]}&event_date_where=BETWEEN&limit=5000&fields=event_id_cnty|event_date|event_type|sub_event_type|actor1|actor2|country|latitude|longitude|fatalities|notes`;

    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) throw new Error(`ACLED API ${res.status}`);

    const json = await res.json();
    const events: AcledEvent[] = json.data ?? [];

    if (events.length === 0) {
      console.warn('[ACLED] No events returned');
      return;
    }

    // Aggregate by country
    const byCountry = new Map<string, CountryAgg>();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - sevenDaysMs;
    const fourteenDaysAgo = now - 2 * sevenDaysMs;

    for (const event of events) {
      const eventTime = new Date(event.event_date).getTime();
      const isLast7d = eventTime >= sevenDaysAgo;
      const isPrev7d = eventTime >= fourteenDaysAgo && eventTime < sevenDaysAgo;

      const existing = byCountry.get(event.country);
      if (existing) {
        existing.events++;
        existing.fatalities += parseInt(event.fatalities) || 0;
        if (event.actor1) existing.actors.add(event.actor1);
        if (isLast7d) existing.eventsLast7d++;
        if (isPrev7d) existing.eventsPrev7d++;
      } else {
        byCountry.set(event.country, {
          country: event.country,
          events: 1,
          fatalities: parseInt(event.fatalities) || 0,
          lat: parseFloat(event.latitude),
          lng: parseFloat(event.longitude),
          latestEvent: event.event_date,
          actors: new Set(event.actor1 ? [event.actor1] : []),
          eventsLast7d: isLast7d ? 1 : 0,
          eventsPrev7d: isPrev7d ? 1 : 0,
        });
      }
    }

    // Convert to Conflict[]
    const conflicts: Conflict[] = [...byCountry.values()]
      .filter((c) => c.events >= 5) // Only significant conflicts
      .sort((a, b) => b.fatalities - a.fatalities)
      .slice(0, 25)
      .map((c, i) => ({
        id: `acled-${i}`,
        name: c.country,
        severity: determineSeverity(c.events, c.fatalities),
        lat: c.lat,
        lng: c.lng,
        region: countryToRegion(c.country),
        casualties: c.fatalities > 0 ? `${c.fatalities.toLocaleString()}+` : '-',
        displaced: '-',
        trend: determineTrend(c.eventsLast7d, c.eventsPrev7d),
        since: c.latestEvent,
      }));

    cache.set('conflicts', conflicts, TTL.CONFLICTS);
    console.log(`[ACLED] ${conflicts.length} conflicts cached from ${events.length} events`);
  } catch (err) {
    console.error('[ACLED] Fetch failed:', err);
  }
}
