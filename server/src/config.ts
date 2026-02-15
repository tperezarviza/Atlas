import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3001;

export const ACLED_EMAIL = process.env.ACLED_EMAIL ?? '';
export const ACLED_PASSWORD = process.env.ACLED_PASSWORD ?? '';
export const EIA_API_KEY = process.env.EIA_API_KEY ?? '';
export const FRED_API_KEY = process.env.FRED_API_KEY ?? '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
export const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY ?? '';
export const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID ?? '';
export const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET ?? '';
export const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN ?? '';
export const ALIENVAULT_API_KEY = process.env.ALIENVAULT_API_KEY ?? '';
export const FIRMS_API_KEY = process.env.FIRMS_API_KEY ?? '';
export const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? '';
export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID ?? '';
export const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// All secret values for error sanitization
const ALL_SECRETS: string[] = [
  ACLED_PASSWORD, EIA_API_KEY, FRED_API_KEY, ANTHROPIC_API_KEY,
  CONGRESS_API_KEY, OPENSKY_CLIENT_SECRET, X_BEARER_TOKEN, ALIENVAULT_API_KEY, CLOUDFLARE_API_TOKEN,
].filter(Boolean);

/** Redact any secret values from an error message. */
export function sanitizeError(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err);
  for (const secret of ALL_SECRETS) {
    if (secret.length >= 8) msg = msg.replaceAll(secret, '[REDACTED]');
  }
  return msg;
}

// Startup: warn about missing critical env vars
const CRITICAL_KEYS = ['ANTHROPIC_API_KEY', 'ACLED_EMAIL', 'ACLED_PASSWORD'] as const;
for (const key of CRITICAL_KEYS) {
  if (!process.env[key]) {
    console.warn(`[CONFIG] WARNING: ${key} is not set — related features will be disabled`);
  }
}

/** TTL values in milliseconds */
export const TTL = {
  MARKETS:     2 * 60 * 1000,      // 2 min
  FEEDS:       3 * 60 * 1000,      // 3 min
  NEWS:       15 * 60 * 1000,      // 15 min
  TICKER:     15 * 60 * 1000,      // 15 min
  CONFLICTS:  60 * 60 * 1000,      // 1 h
  MACRO:      60 * 60 * 1000,      // 1 h
  BRIEF:     13 * 60 * 60 * 1000,  // 13 h (morning + afternoon cycle)
  CONNECTIONS: 4 * 60 * 60 * 1000, // 4 h
  CALENDAR:  12 * 60 * 60 * 1000,  // 12 h
  BORDER:    24 * 60 * 60 * 1000,  // 24 h
  FOREX:      5 * 60 * 1000,       // 5 min
  COUNTRIES:  60 * 60 * 1000,      // 1 h
  SANCTIONS:  24 * 60 * 60 * 1000, // 24 h
  ARMED_GROUPS: 60 * 60 * 1000,    // 1 h
  SHIPPING:   30 * 60 * 1000,      // 30 min
  OONI:       60 * 60 * 1000,      // 1 h
  HOSTILITY:  6 * 60 * 60 * 1000,  // 6 h
  PROPAGANDA: 12 * 60 * 60 * 1000, // 12 h
  CONGRESS:        2 * 60 * 60 * 1000,  // 2 h
  EXECUTIVE_ORDERS:12 * 60 * 60 * 1000, // 12 h
  FLIGHTS:         2 * 60 * 1000,       // 2 min
  UKRAINE_FRONT:   60 * 60 * 1000,      // 1 h
  TWITTER:         5 * 60 * 1000,       // 5 min
  CYBER_THREATS:   60 * 60 * 1000,      // 1 h
  EONET:          30 * 60 * 1000,       // 30 min
  ECON_CALENDAR:   4 * 60 * 60 * 1000,  // 4 h
  ALERTS:     30_000,                   // 30 s
  STATIC:     7 * 24 * 60 * 60 * 1000, // 7 d
  CII:           30 * 60 * 1000,        // 30 min
  FOCAL_POINTS:  15 * 60 * 1000,        // 15 min
  ANOMALY:       15 * 60 * 1000,        // 15 min
  POLYMARKET:     5 * 60 * 1000,        // 5 min
  CLOUDFLARE:    15 * 60 * 1000,        // 15 min
  FIRMS:         30 * 60 * 1000,        // 30 min
} as const;

export const FETCH_TIMEOUT_API = 15_000;
export const FETCH_TIMEOUT_RSS = 10_000;
