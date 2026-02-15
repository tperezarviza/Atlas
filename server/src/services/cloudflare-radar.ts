import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';

export interface CloudflareOutage {
  id: string;
  asn: number | null;
  asName: string | null;
  locations: string[];     // ISO country codes
  eventType: string;       // 'OUTAGE' | 'ROUTE_LEAK' | etc.
  scope: string;           // 'Country' | 'Region' | 'ASN'
  startDate: string;
  endDate: string | null;  // null = ongoing
  description: string;
}

const CF_API_TOKEN = process.env.CF_API_TOKEN ?? '';

export async function fetchCloudflareOutages(): Promise<void> {
  if (!CF_API_TOKEN) {
    // TODO: Cloudflare Radar annotations API requires auth (X-Auth-Email + X-Auth-Key or Bearer token).
    // Set CF_API_TOKEN in .env once we have a Cloudflare API token.
    console.warn('[CLOUDFLARE] No CF_API_TOKEN set, skipping outage fetch');
    return;
  }

  console.log('[CLOUDFLARE] Fetching internet outages...');
  try {
    const url = `https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=7d&format=json&limit=50`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CF_API_TOKEN}`,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;

    const annotations = json.result?.annotations ?? [];
    const outages: CloudflareOutage[] = annotations.map((a: any) => ({
      id: a.id ?? `cf-${Date.now()}-${Math.random()}`,
      asn: a.asn ?? null,
      asName: a.asName ?? null,
      locations: a.locations ?? [],
      eventType: a.eventType ?? 'OUTAGE',
      scope: a.scope ?? 'Unknown',
      startDate: a.startDate,
      endDate: a.endDate ?? null,
      description: a.description ?? '',
    }));

    cache.set('cloudflare_outages', outages, TTL.CLOUDFLARE);
    console.log(`[CLOUDFLARE] ${outages.length} outage annotations cached`);
  } catch (err) {
    console.error('[CLOUDFLARE] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
