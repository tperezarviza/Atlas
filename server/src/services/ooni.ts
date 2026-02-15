import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { safeJson } from '../utils.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import type { InternetIncident } from '../types.js';

interface OoniIncident {
  id: number;
  title: string;
  short_description: string;
  start_time: string;
  end_time?: string;
  event_type: string;
  ASNs?: number[];
  CCs?: string[];
}

const COUNTRY_NAMES: Record<string, string> = {
  IR: 'Iran', CN: 'China', RU: 'Russia', MM: 'Myanmar', PK: 'Pakistan',
  ET: 'Ethiopia', SD: 'Sudan', BY: 'Belarus', KP: 'North Korea', CU: 'Cuba',
  VE: 'Venezuela', BD: 'Bangladesh', UG: 'Uganda', TZ: 'Tanzania', IQ: 'Iraq',
  SY: 'Syria', YE: 'Yemen', EG: 'Egypt', TR: 'Turkey', IN: 'India',
  TH: 'Thailand', VN: 'Vietnam', ID: 'Indonesia', NG: 'Nigeria', KE: 'Kenya',
};

export async function fetchOoniIncidents(): Promise<void> {
  console.log('[OONI] Fetching internet incident data...');

  try {
    const raw = await withCircuitBreaker<OoniIncident[]>(
      'ooni',
      async () => {
        const res = await fetch('https://api.ooni.io/api/v1/incidents/search?status=ongoing&limit=50', {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
          headers: { 'User-Agent': 'ATLAS/1.0 (Geopolitical Dashboard)' },
        });
        if (!res.ok) throw new Error(`OONI API ${res.status}`);
        const json = await safeJson<Record<string, unknown>>(res);
        return ((json.incidents ?? []) as OoniIncident[]).slice(0, 100);
      },
      () => [] as OoniIncident[],
    );

    if (raw.length === 0) {
      console.warn('[OONI] No incidents returned');
      return;
    }

    const incidents: InternetIncident[] = raw.map((inc, i) => {
      const cc = inc.CCs?.[0] ?? '';
      return {
        id: `ooni-${inc.id ?? i}`,
        country: COUNTRY_NAMES[cc] ?? cc,
        countryCode: cc,
        title: inc.title ?? 'Unknown incident',
        startDate: inc.start_time ?? new Date().toISOString(),
        endDate: inc.end_time ?? undefined,
        asns: inc.ASNs?.map(String),
        shortDescription: inc.short_description ?? '',
        eventType: inc.event_type ?? 'unknown',
      };
    });

    cache.set('ooni', incidents, TTL.OONI);
    console.log(`[OONI] ${incidents.length} internet incidents cached`);
  } catch (err) {
    console.error('[OONI] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
