import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3001;

export const ACLED_EMAIL = process.env.ACLED_EMAIL ?? '';
export const ACLED_PASSWORD = process.env.ACLED_PASSWORD ?? '';
export const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY ?? '';
export const EIA_API_KEY = process.env.EIA_API_KEY ?? '';
export const FRED_API_KEY = process.env.FRED_API_KEY ?? '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

/** TTL values in milliseconds */
export const TTL = {
  MARKETS:     2 * 60 * 1000,      // 2 min
  FEEDS:       3 * 60 * 1000,      // 3 min
  NEWS:       15 * 60 * 1000,      // 15 min
  TICKER:     15 * 60 * 1000,      // 15 min
  CONFLICTS:  60 * 60 * 1000,      // 1 h
  MACRO:      60 * 60 * 1000,      // 1 h
  BRIEF:      4 * 60 * 60 * 1000,  // 4 h
  CONNECTIONS: 4 * 60 * 60 * 1000, // 4 h
  CALENDAR:  12 * 60 * 60 * 1000,  // 12 h
  BORDER:    24 * 60 * 60 * 1000,  // 24 h
  CDS:        6 * 60 * 60 * 1000,  // 6 h
  FOREX:      5 * 60 * 1000,       // 5 min
  COUNTRIES:  60 * 60 * 1000,      // 1 h
  SANCTIONS:  24 * 60 * 60 * 1000, // 24 h
  ARMED_GROUPS: 60 * 60 * 1000,    // 1 h
  SHIPPING:   30 * 60 * 1000,      // 30 min
  OONI:       60 * 60 * 1000,      // 1 h
  HOSTILITY:  6 * 60 * 60 * 1000,  // 6 h
  PROPAGANDA: 12 * 60 * 60 * 1000, // 12 h
  STATIC:     7 * 24 * 60 * 60 * 1000, // 7 d
} as const;

export const FETCH_TIMEOUT_API = 15_000;
export const FETCH_TIMEOUT_RSS = 10_000;
