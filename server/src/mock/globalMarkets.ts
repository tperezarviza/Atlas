import type { MarketSection, CDSSpread } from '../types.js';

const spark = (base: number, pct: number): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < 20; i++) {
    const progress = i / 19;
    pts.push(Math.round(10 + progress * 80 + (Math.random() - 0.5) * 15));
  }
  // Adjust last point to reflect direction
  if (pct > 0) pts[19] = Math.min(95, pts[19] + 10);
  if (pct < 0) pts[19] = Math.max(10, pts[19] - 10);
  return pts;
};

// ── Regional Index Sections ────────────────────────────────────

export const mockRegionalIndices: MarketSection[] = [
  {
    title: 'Americas', icon: '🌎',
    items: [
      { name: 'S&P 500',  price: '6,127',  delta: '▲ +0.4%', direction: 'up',   sparkData: spark(6127, 0.4),  color: '#28b35a' },
      { name: 'DOW',      price: '44,892', delta: '▲ +0.3%', direction: 'up',   sparkData: spark(44892, 0.3), color: '#28b35a' },
      { name: 'NASDAQ',   price: '19,643', delta: '▲ +0.6%', direction: 'up',   sparkData: spark(19643, 0.6), color: '#28b35a' },
      { name: 'RUSSELL',  price: '2,284',  delta: '▼ -0.2%', direction: 'down', sparkData: spark(2284, -0.2) },
      { name: 'BOVESPA',  price: '127,341',delta: '▲ +1.1%', direction: 'up',   sparkData: spark(127341, 1.1) },
      { name: 'MERVAL',   price: '2,145,200', delta: '▲ +2.3%', direction: 'up', sparkData: spark(2145200, 2.3) },
      { name: 'BMV IPC',  price: '53,412', delta: '▬ 0.0%',  direction: 'flat', sparkData: spark(53412, 0) },
    ],
  },
  {
    title: 'Europe', icon: '🌍',
    items: [
      { name: 'FTSE 100',  price: '8,412',  delta: '▲ +0.2%', direction: 'up',   sparkData: spark(8412, 0.2) },
      { name: 'DAX',       price: '18,923', delta: '▲ +0.5%', direction: 'up',   sparkData: spark(18923, 0.5) },
      { name: 'CAC 40',    price: '7,834',  delta: '▼ -0.1%', direction: 'down', sparkData: spark(7834, -0.1) },
      { name: 'IBEX 35',   price: '11,245', delta: '▲ +0.3%', direction: 'up',   sparkData: spark(11245, 0.3) },
      { name: 'FTSE MIB',  price: '34,567', delta: '▲ +0.4%', direction: 'up',   sparkData: spark(34567, 0.4) },
      { name: 'MOEX',      price: '3,245',  delta: '▼ -0.8%', direction: 'down', sparkData: spark(3245, -0.8) },
    ],
  },
  {
    title: 'Asia-Pacific', icon: '🌏',
    items: [
      { name: 'NIKKEI',    price: '38,456', delta: '▲ +0.7%', direction: 'up',   sparkData: spark(38456, 0.7) },
      { name: 'HANG SENG', price: '17,823', delta: '▼ -0.4%', direction: 'down', sparkData: spark(17823, -0.4) },
      { name: 'SHANGHAI',  price: '3,089',  delta: '▲ +0.2%', direction: 'up',   sparkData: spark(3089, 0.2) },
      { name: 'SHENZHEN',  price: '9,456',  delta: '▲ +0.3%', direction: 'up',   sparkData: spark(9456, 0.3) },
      { name: 'KOSPI',     price: '2,634',  delta: '▼ -0.5%', direction: 'down', sparkData: spark(2634, -0.5) },
      { name: 'ASX 200',   price: '7,892',  delta: '▲ +0.1%', direction: 'up',   sparkData: spark(7892, 0.1) },
      { name: 'SENSEX',    price: '72,456', delta: '▲ +0.6%', direction: 'up',   sparkData: spark(72456, 0.6) },
      { name: 'NIFTY 50',  price: '21,834', delta: '▲ +0.5%', direction: 'up',   sparkData: spark(21834, 0.5) },
      { name: 'TAIEX',     price: '18,234', delta: '▼ -0.3%', direction: 'down', sparkData: spark(18234, -0.3) },
    ],
  },
  {
    title: 'Middle East/Africa', icon: '🕌',
    items: [
      { name: 'TADAWUL',  price: '12,145', delta: '▲ +0.2%', direction: 'up',   sparkData: spark(12145, 0.2) },
      { name: 'TA-35',    price: '2,034',  delta: '▼ -0.6%', direction: 'down', sparkData: spark(2034, -0.6) },
      { name: 'EGX 30',   price: '28,456', delta: '▲ +1.2%', direction: 'up',   sparkData: spark(28456, 1.2) },
    ],
  },
];

// ── Forex Sections ─────────────────────────────────────────────

export const mockForexSections: MarketSection[] = [
  {
    title: 'Forex Major', icon: '💱',
    items: [
      { name: 'EUR/USD', price: '1.0842', delta: '▼ -0.2%', direction: 'down', sparkData: spark(1.08, -0.2) },
      { name: 'GBP/USD', price: '1.2534', delta: '▲ +0.1%', direction: 'up',   sparkData: spark(1.25, 0.1) },
      { name: 'USD/JPY', price: '154.32', delta: '▲ +0.3%', direction: 'up',   sparkData: spark(154, 0.3) },
      { name: 'USD/CHF', price: '0.8891', delta: '▼ -0.1%', direction: 'down', sparkData: spark(0.89, -0.1) },
      { name: 'AUD/USD', price: '0.6523', delta: '▼ -0.4%', direction: 'down', sparkData: spark(0.65, -0.4) },
      { name: 'USD/CAD', price: '1.3612', delta: '▲ +0.2%', direction: 'up',   sparkData: spark(1.36, 0.2) },
    ],
  },
  {
    title: 'Forex Geopolitical', icon: '🏛️',
    items: [
      { name: 'USD/CNY', price: '7.2841', delta: '▲ +0.1%', direction: 'up',   sparkData: spark(7.28, 0.1) },
      { name: 'USD/RUB', price: '96.42',  delta: '▼ -0.3%', direction: 'down', sparkData: spark(96, -0.3) },
      { name: 'USD/TRY', price: '36.21',  delta: '▲ +0.5%', direction: 'up',   sparkData: spark(36, 0.5) },
      { name: 'USD/ARS', price: '1,052',  delta: '▲ +0.2%', direction: 'up',   sparkData: spark(1052, 0.2) },
      { name: 'USD/BRL', price: '5.94',   delta: '▲ +0.8%', direction: 'up',   sparkData: spark(5.94, 0.8) },
      { name: 'USD/MXN', price: '20.45',  delta: '▲ +0.3%', direction: 'up',   sparkData: spark(20.45, 0.3) },
      { name: 'USD/UAH', price: '41.52',  delta: '▬ 0.0%',  direction: 'flat', sparkData: spark(41.5, 0) },
      { name: 'USD/ILS', price: '3.72',   delta: '▲ +0.4%', direction: 'up',   sparkData: spark(3.72, 0.4) },
      { name: 'USD/IRR', price: '42,000', delta: '▬ 0.0%',  direction: 'flat', sparkData: spark(42000, 0) },
      { name: 'EUR/CHF', price: '0.9634', delta: '▼ -0.1%', direction: 'down', sparkData: spark(0.96, -0.1) },
    ],
  },
];

// ── CDS Spreads ────────────────────────────────────────────────

export const mockCDS: CDSSpread[] = [
  { country: 'USA',          code: 'US', spread5Y: 38,   change: -1,  direction: 'down', rating: 'AA+' },
  { country: 'Germany',      code: 'DE', spread5Y: 18,   change: 0,   direction: 'flat', rating: 'AAA' },
  { country: 'United Kingdom',code: 'GB', spread5Y: 28,  change: 1,   direction: 'flat', rating: 'AA' },
  { country: 'Japan',        code: 'JP', spread5Y: 25,   change: -2,  direction: 'down', rating: 'A+' },
  { country: 'China',        code: 'CN', spread5Y: 68,   change: 3,   direction: 'up',   rating: 'A+' },
  { country: 'India',        code: 'IN', spread5Y: 95,   change: -1,  direction: 'down', rating: 'BBB-' },
  { country: 'Brazil',       code: 'BR', spread5Y: 145,  change: 5,   direction: 'up',   rating: 'BB' },
  { country: 'Mexico',       code: 'MX', spread5Y: 110,  change: 2,   direction: 'up',   rating: 'BBB' },
  { country: 'South Africa', code: 'ZA', spread5Y: 215,  change: -3,  direction: 'down', rating: 'BB-' },
  { country: 'Turkey',       code: 'TR', spread5Y: 285,  change: 8,   direction: 'up',   rating: 'B' },
  { country: 'Argentina',    code: 'AR', spread5Y: 680,  change: -15, direction: 'down', rating: 'CCC+' },
  { country: 'Egypt',        code: 'EG', spread5Y: 520,  change: 12,  direction: 'up',   rating: 'B-' },
  { country: 'Pakistan',     code: 'PK', spread5Y: 890,  change: 20,  direction: 'up',   rating: 'CCC+' },
  { country: 'Nigeria',      code: 'NG', spread5Y: 410,  change: 5,   direction: 'up',   rating: 'B-' },
  { country: 'Russia',       code: 'RU', spread5Y: 0,    change: 0,   direction: 'flat', rating: 'NR' },
  { country: 'Ukraine',      code: 'UA', spread5Y: 2800, change: -50, direction: 'down', rating: 'CC' },
  { country: 'Israel',       code: 'IL', spread5Y: 82,   change: 4,   direction: 'up',   rating: 'A+' },
  { country: 'Saudi Arabia', code: 'SA', spread5Y: 55,   change: -1,  direction: 'down', rating: 'A' },
  { country: 'Iran',         code: 'IR', spread5Y: 0,    change: 0,   direction: 'flat', rating: 'NR' },
];
