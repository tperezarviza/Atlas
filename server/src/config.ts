import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3001;

export const ACLED_API_KEY = process.env.ACLED_API_KEY ?? '';
export const ACLED_EMAIL = process.env.ACLED_EMAIL ?? '';
export const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY ?? '';
export const OIL_PRICE_API_KEY = process.env.OIL_PRICE_API_KEY ?? '';
export const METALS_API_KEY = process.env.METALS_API_KEY ?? '';
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
} as const;

export const FETCH_TIMEOUT_API = 15_000;
export const FETCH_TIMEOUT_RSS = 10_000;
