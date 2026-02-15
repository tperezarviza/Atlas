import { OPENSKY_CLIENT_ID, OPENSKY_CLIENT_SECRET, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import type { MilitaryFlight, FlightCategory } from '../types.js';

// OpenSky OAuth2 token management
let accessToken: string | null = null;
let tokenExpiry = 0;

const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const API_BASE = 'https://opensky-network.org/api';

async function getAccessToken(): Promise<string | null> {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return null;
  if (accessToken && Date.now() < tokenExpiry - 30_000) return accessToken;

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[FLIGHTS] OAuth token request failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;
    console.log('[FLIGHTS] OAuth token acquired');
    return accessToken;
  } catch (err) {
    console.warn('[FLIGHTS] OAuth error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// Regions to monitor with bounding boxes [lamin, lomin, lamax, lomax]
const REGIONS: Record<string, [number, number, number, number]> = {
  europe_ukraine: [44, 20, 58, 42],
  middle_east:    [12, 25, 42, 60],
  taiwan_strait:  [20, 115, 28, 125],
  korean_peninsula: [33, 124, 43, 132],
  baltic_sea:     [53, 14, 60, 30],
  black_sea:      [41, 27, 47, 42],
  us_east_coast:  [25, -82, 45, -65],
};

// Military callsign prefixes
const MILITARY_CALLSIGN_PREFIXES = [
  'RCH', 'REACH', 'DOOM', 'EVIL', 'NAVY', 'TOPCAT', 'NATO',
  'RRR', 'ASCOT', 'LAGR', 'PACK', 'FORTE', 'HOMER', 'JAKE',
  'DUKE', 'COLT', 'VIPER', 'HAWK', 'BOLT', 'SPAR',
  'SAM', 'EXEC', 'VENUS', 'ATOM', 'KING', 'BISON',
  'NCHO', 'ORDER', 'CASA', 'MIDAS', 'YANK', 'SHARK',
  'WOLF', 'COBRA', 'TEAL', 'IRON',
  'IAF',   // Israel Air Force
  'THK',   // Turkish Air Force
  'RJAF',  // Royal Jordanian Air Force
  'RSD',   // Royal Saudi Air Force
  'AMR',   // Italian Air Force
];

// Known military ICAO24 prefixes by country (narrowed to avoid civilian overlap)
const MILITARY_ICAO_PREFIXES = [
  'ae',   // US military (AE0000-AEFFFF — dedicated DoD block)
  'adf',  // US government upper range
  '43c',  // UK military (RAF/RN)
  '43d',  // UK military
  '3a8',  // France military (Armée de l'Air)
  '3a9',  // France military
  '3f8',  // Germany military (Luftwaffe)
  '3f9',  // Germany military
  '3fc',  // Germany military
  '738',  // Israel Air Force
  '739',  // Israel Air Force
  '4b8',  // Turkish Air Force
  '4b9',  // Turkish Air Force
  '7cf',  // Royal Australian Air Force
  '7c0',  // Royal Australian Air Force
  'c0d',  // Royal Canadian Air Force
  'c0e',  // Royal Canadian Air Force
  '33e',  // Italian Air Force
  '33f',  // Italian Air Force
  '840',  // Japan Air Self-Defense Force
  '841',  // Japan Air Self-Defense Force
  '478',  // NATO
];

function isMilitaryCallsign(callsign: string): boolean {
  const cs = callsign.trim().toUpperCase();
  return MILITARY_CALLSIGN_PREFIXES.some(p => cs.startsWith(p));
}

function isMilitaryIcao(icao24: string): boolean {
  const hex = icao24.toLowerCase();
  return MILITARY_ICAO_PREFIXES.some(p => hex.startsWith(p));
}

function classifyAircraft(callsign: string): FlightCategory {
  const cs = callsign.trim().toUpperCase();
  if (/^(FORTE|HOMER|JAKE|NCHO|RECON|NAVY\d)/.test(cs)) return 'surveillance';
  if (/^(RCH|REACH|CASA|ASCOT|RRR)/.test(cs)) return 'transport';
  if (/^(LAGR|PACK|MIDAS|TEAL)/.test(cs)) return 'tanker';
  if (/^(DOOM|EVIL)/.test(cs)) return 'bomber';
  if (/^(SAM|EXEC|SPAR|VENUS|ATOM|ORDER|NATO|KING|TOPCAT)/.test(cs)) return 'command';
  if (/^(VIPER|HAWK|BOLT|COLT|DUKE|WOLF|COBRA|SHARK|IRON|BISON|YANK)/.test(cs)) return 'fighter';
  return 'unknown';
}

async function fetchRegion(
  regionName: string,
  bbox: [number, number, number, number],
  token: string | null,
): Promise<MilitaryFlight[]> {
  const [lamin, lomin, lamax, lomax] = bbox;
  const url = `${API_BASE}/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.warn(`[FLIGHTS] Rate limited on region ${regionName}`);
      return [];
    }
    throw new Error(`OpenSky ${regionName}: ${res.status}`);
  }

  const data = await res.json() as { states: any[] | null };
  if (!data.states) return [];

  const military: MilitaryFlight[] = [];

  for (const s of data.states) {
    const icao24 = (s[0] || '') as string;
    const callsign = (s[1] || '') as string;
    const originCountry = (s[2] || '') as string;

    if (!isMilitaryCallsign(callsign) && !isMilitaryIcao(icao24)) continue;

    const lat = s[6] as number | null;
    const lng = s[5] as number | null;
    if (lat == null || lng == null) continue;

    military.push({
      icao24,
      callsign: callsign.trim(),
      origin_country: originCountry,
      category: classifyAircraft(callsign),
      lat,
      lng,
      altitude_m: (s[7] as number) || 0,
      velocity_ms: (s[9] as number) || 0,
      heading: (s[10] as number) || 0,
      on_ground: (s[8] as boolean) || false,
      last_seen: (s[4] as number) || 0,
      region: regionName,
    });
  }

  return military;
}

export async function fetchFlights(): Promise<void> {
  if (cache.isFresh('flights')) return;
  console.log('[FLIGHTS] Fetching military flights...');

  try {
    const token = await getAccessToken();
    const allFlights: MilitaryFlight[] = [];
    const seen = new Set<string>();

    // Fetch regions sequentially to respect rate limits
    for (const [name, bbox] of Object.entries(REGIONS)) {
      try {
        const flights = await withCircuitBreaker(
          'opensky',
          () => fetchRegion(name, bbox, token),
          () => [] as MilitaryFlight[],
        );
        for (const f of flights) {
          if (!seen.has(f.icao24)) {
            seen.add(f.icao24);
            allFlights.push(f);
          }
        }
        // Small delay between requests to be nice to the API
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.warn(`[FLIGHTS] Region ${name} failed:`, err instanceof Error ? err.message : err);
      }
    }

    cache.set('flights', allFlights, TTL.FLIGHTS);
    console.log(`[FLIGHTS] Cached ${allFlights.length} military flights across ${Object.keys(REGIONS).length} regions`);
  } catch (err) {
    console.error('[FLIGHTS] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
