import type { SessionRegion } from '../types.js';

export interface SymbolDef {
  symbol: string;
  name: string;
  region: SessionRegion;
  section: string;
  color?: string;
  pricePrefix?: string;
  source: 'yahoo';
}

// ── Index Symbols ──────────────────────────────────────────────
// TwelveData: only US majors (SPX, DJI, IXIC, RUT, VIX, DXY) — reliable symbols
// Yahoo Finance: all international indices — more reliable for non-US

export const INDEX_SYMBOLS: SymbolDef[] = [
  // Americas — US via TwelveData, LatAm via Yahoo
  { symbol: 'SPX',  name: 'S&P 500',  region: 'americas', section: 'Americas', color: '#28b35a', pricePrefix: '', source: 'yahoo' },
  { symbol: 'DJI',  name: 'DOW',      region: 'americas', section: 'Americas', color: '#28b35a', pricePrefix: '', source: 'yahoo' },
  { symbol: 'IXIC', name: 'NASDAQ',   region: 'americas', section: 'Americas', color: '#28b35a', pricePrefix: '', source: 'yahoo' },
  { symbol: 'RUT',  name: 'RUSSELL',  region: 'americas', section: 'Americas', pricePrefix: '', source: 'yahoo' },
  { symbol: 'IBOV', name: 'BOVESPA',  region: 'americas', section: 'Americas', pricePrefix: '', source: 'yahoo' },
  { symbol: 'MERV', name: 'MERVAL',   region: 'americas', section: 'Americas', pricePrefix: '', source: 'yahoo' },
  { symbol: 'MXX',  name: 'BMV IPC',  region: 'americas', section: 'Americas', pricePrefix: '', source: 'yahoo' },

  // Europe — all via Yahoo (TwelveData maps DAX/CAC/FTSE to ETFs, not indices)
  { symbol: 'FTSE',    name: 'FTSE 100',  region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },
  { symbol: 'DAX',     name: 'DAX',       region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },
  { symbol: 'CAC',     name: 'CAC 40',    region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },
  { symbol: 'IBEX',    name: 'IBEX 35',   region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },
  { symbol: 'FTSEMIB', name: 'FTSE MIB',  region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },
  { symbol: 'MOEX',    name: 'MOEX',      region: 'europe', section: 'Europe', pricePrefix: '', source: 'yahoo' },

  // Asia-Pacific — all via Yahoo
  { symbol: 'NI225',     name: 'NIKKEI',    region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'HSI',       name: 'HANG SENG', region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: '000001.SS', name: 'SHANGHAI',  region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: '399001.SZ', name: 'SHENZHEN',  region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'KOSPI',     name: 'KOSPI',     region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'XJO',       name: 'ASX 200',   region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'SENSEX',    name: 'SENSEX',    region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'NIFTY50',   name: 'NIFTY 50',  region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },
  { symbol: 'TAIEX',     name: 'TAIEX',     region: 'asia_pacific', section: 'Asia-Pacific', pricePrefix: '', source: 'yahoo' },

  // Middle East / Africa — all via Yahoo
  { symbol: 'TASI',  name: 'TADAWUL', region: 'middle_east_africa', section: 'Middle East/Africa', pricePrefix: '', source: 'yahoo' },
  { symbol: 'TA35',  name: 'TA-35',   region: 'middle_east_africa', section: 'Middle East/Africa', pricePrefix: '', source: 'yahoo' },
  { symbol: 'EGX30', name: 'EGX 30',  region: 'middle_east_africa', section: 'Middle East/Africa', pricePrefix: '', source: 'yahoo' },
];

// ── Forex Symbols ──────────────────────────────────────────────
// All via Yahoo Finance (SYMBOL=X format) — TwelveData free tier
// rate limits make forex too expensive alongside indices

export const FOREX_SYMBOLS: SymbolDef[] = [
  // Major
  { symbol: 'EUR/USD', name: 'EUR/USD', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  { symbol: 'GBP/USD', name: 'GBP/USD', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/JPY', name: 'USD/JPY', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/CHF', name: 'USD/CHF', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  { symbol: 'AUD/USD', name: 'AUD/USD', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/CAD', name: 'USD/CAD', region: 'americas', section: 'Forex Major', pricePrefix: '', source: 'yahoo' },
  // Geopolitical
  { symbol: 'USD/CNY', name: 'USD/CNY', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/RUB', name: 'USD/RUB', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/TRY', name: 'USD/TRY', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/ARS', name: 'USD/ARS', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/BRL', name: 'USD/BRL', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/MXN', name: 'USD/MXN', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/UAH', name: 'USD/UAH', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/ILS', name: 'USD/ILS', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'USD/IRR', name: 'USD/IRR', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
  { symbol: 'EUR/CHF', name: 'EUR/CHF', region: 'americas', section: 'Forex Geopolitical', pricePrefix: '', source: 'yahoo' },
];

// Symbols to always fetch regardless of session (market indicators)
export const ALWAYS_FETCH = ['VIX', 'DXY'];
