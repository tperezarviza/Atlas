import { FETCH_TIMEOUT_API, TTL, RAPIDAPI_KEY } from '../config.js';
import { cache } from '../cache.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import type { MilitaryFlight, FlightCategory } from '../types.js';

const RAPIDAPI_HOST = 'adsbexchange-com1.p.rapidapi.com';
const API_URL = `https://${RAPIDAPI_HOST}/v2/mil/`;

// Military callsign prefixes (kept from OpenSky era)
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

function classifyAircraft(callsign: string): FlightCategory {
  const cs = callsign.trim().toUpperCase();
  if (/^(FORTE|HOMER|JAKE|NCHO|RECON|NAVY\d)/.test(cs)) return 'surveillance';
  if (/^(RCH|REACH|CASA|ASCOT|RRR)/.test(cs)) return 'transport';
  if (/^(LAGR|PACK|MIDAS|TEAL)/.test(cs)) return 'tanker';
  if (/^(DOOM|EVIL)/.test(cs)) return 'bomber';
  if (/^(SAM|EXEC|SPAR|VENUS|ATOM|ORDER|NATO|KING|TOPCAT)/.test(cs)) return 'command';
  if (/^(VIPER|HAWK|BOLT|COLT|DUKE|WOLF|COBRA|SHARK|IRON|BISON|YANK)/.test(cs)) return 'fighter';
  if (MILITARY_CALLSIGN_PREFIXES.some(p => cs.startsWith(p))) return 'unknown';
  return 'unknown';
}

export async function fetchFlights(): Promise<void> {
  if (cache.isFresh('flights')) return;
  if (!RAPIDAPI_KEY) {
    console.warn('[FLIGHTS] No RAPIDAPI_KEY configured');
    return;
  }
  console.log('[FLIGHTS] Fetching military flights from ADSB Exchange...');

  try {
    const flights = await withCircuitBreaker('adsb', async () => {
      const res = await fetch(API_URL, {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
      });
      if (!res.ok) throw new Error(`ADSB ${res.status}`);
      const data = await res.json() as { ac?: any[] };
      return (data.ac ?? []).map((a: any): MilitaryFlight => ({
        icao24: a.hex ?? '',
        callsign: (a.flight ?? '').trim(),
        origin_country: a.cou ?? '',
        category: classifyAircraft((a.flight ?? '').trim()),
        lat: a.lat ?? 0,
        lng: a.lon ?? 0,
        altitude_m: (a.alt_baro === 'ground' ? 0 : (a.alt_baro ?? 0)) * 0.3048,
        velocity_ms: (a.gs ?? 0) * 0.514444,
        heading: a.track ?? 0,
        on_ground: a.alt_baro === 'ground',
        last_seen: Math.floor(Date.now() / 1000),
        region: 'global',
      }));
    }, () => [] as MilitaryFlight[]);

    cache.set('flights', flights, TTL.FLIGHTS);
    console.log(`[FLIGHTS] ${flights.length} military aircraft cached globally`);
  } catch (err) {
    console.error('[FLIGHTS] Fetch failed:', err);
  }
}
