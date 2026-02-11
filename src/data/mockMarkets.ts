import type { MarketSection, MacroItem, BorderStat, CDSSpread } from '../types';

export const mockMarketSections: MarketSection[] = [
  {
    title: 'Energy', icon: '⛽',
    items: [
      { name: 'WTI OIL', price: '$72.34', delta: '▲ +1.2%', direction: 'up', sparkData: [40,45,50,55,48,52,58,62,55,60,65,58,62,68,72,70,75,72,68,72] },
      { name: 'BRENT', price: '$75.81', delta: '▲ +0.9%', direction: 'up', sparkData: [42,48,52,56,50,54,60,64,57,62,67,60,64,70,74,72,77,74,70,75] },
      { name: 'NAT GAS', price: '$3.42', delta: '▼ -2.1%', direction: 'down', sparkData: [60,55,50,48,52,58,62,65,70,68,72,75,70,65,60,58,55,52,50,48] },
    ],
  },
  {
    title: 'Precious Metals', icon: '🥇',
    items: [
      { name: 'GOLD', price: '$2,847', delta: '▲ +0.3%', direction: 'up', sparkData: [55,58,60,62,65,68,70,72,75,73,76,78,80,82,85,83,86,88,85,87], color: '#d4a72c' },
      { name: 'SILVER', price: '$32.14', delta: '▲ +0.5%', direction: 'up', sparkData: [50,52,55,53,56,58,60,62,58,60,63,65,62,64,66,68,65,67,64,66], color: '#94a3b8' },
    ],
  },
  {
    title: 'Crypto', icon: '₿',
    items: [
      { name: 'BITCOIN', price: '$97,234', delta: '▼ -2.1%', direction: 'down', sparkData: [85,82,78,75,72,68,65,70,74,78,82,80,76,73,70,68,72,75,78,74], color: '#e8842b' },
      { name: 'ETHEREUM', price: '$2,645', delta: '▼ -3.4%', direction: 'down', sparkData: [70,68,65,62,58,55,52,56,60,64,68,66,62,58,55,52,56,60,64,60], color: '#9b59e8' },
    ],
  },
  {
    title: 'Indices', icon: '📈',
    items: [
      { name: 'S&P 500', price: '6,127', delta: '▲ +0.4%', direction: 'up', sparkData: [60,62,65,68,70,72,75,73,76,78,80,82,78,80,83,85,82,84,86,84], color: '#28b35a' },
      { name: 'DOW', price: '44,892', delta: '▲ +0.3%', direction: 'up', sparkData: [58,60,63,66,68,70,73,71,74,76,78,80,76,78,81,83,80,82,84,82], color: '#28b35a' },
      { name: 'VIX', price: '14.2', delta: '▼ -3.1%', direction: 'down', sparkData: [40,45,42,38,35,32,30,34,36,32,28,25,28,32,30,26,24,22,20,18], color: '#e83b3b' },
      { name: 'DXY', price: '108.3', delta: '▲ +0.2%', direction: 'up', sparkData: [65,68,70,72,75,73,76,78,80,82,84,82,85,83,86,84,87,85,88,86] },
      { name: '10Y YIELD', price: '4.52%', delta: '▬ 0.0%', direction: 'flat', sparkData: [60,62,64,66,68,65,63,66,68,70,72,70,68,66,64,62,60,62,64,62] },
    ],
  },
  {
    title: 'Geopolitical Commodities', icon: '🌾',
    items: [
      { name: 'WHEAT', price: '$5.82', delta: '▲ +1.8%', direction: 'up', sparkData: [45,50,48,55,58,52,56,60,55,58,62,60,65,63,68,65,70,68,72,70] },
      { name: 'SOYBEANS', price: '$10.24', delta: '▼ -0.6%', direction: 'down', sparkData: [65,62,60,58,55,58,60,56,54,52,55,58,56,54,52,50,48,52,50,48] },
    ],
  },
];

export const mockMacro: MacroItem[] = [
  { label: 'National Debt', value: '$36.42 T', color: '#e83b3b' },
  { label: 'DOGE Savings', value: '$172B claimed', color: '#28b35a' },
  { label: 'Fed Rate', value: '4.25-4.50%' },
  { label: 'CPI (YoY)', value: '2.9%' },
  { label: 'Unemployment', value: '4.0%' },
];

export const mockBorderStats: BorderStat[] = [
  { label: 'SW Encounters/mo', value: '30,561', delta: '▼ -95% vs Biden', color: '#28b35a' },
  { label: 'USBP Releases', value: 'ZERO (6 mo streak)', color: '#28b35a' },
  { label: 'Fentanyl Seized', value: '12,400 lbs' },
  { label: 'ICE Arrests', value: '48,290' },
  { label: 'Daily SW Apprehensions', value: '258/day', delta: '▼ from 5,110', color: '#28b35a' },
];

export const mockForexSections: MarketSection[] = [
  {
    title: 'Forex Major', icon: '💱',
    items: [
      { name: 'EUR/USD', price: '1.0842', delta: '▼ -0.2%', direction: 'down', sparkData: [55,52,50,48,52,54,50,48,46,44,48,50,46,44,42,40,44,46,42,40] },
      { name: 'GBP/USD', price: '1.2534', delta: '▲ +0.1%', direction: 'up',   sparkData: [50,52,54,56,58,55,57,59,61,63,60,62,64,66,68,65,67,69,71,68] },
      { name: 'USD/JPY', price: '154.32', delta: '▲ +0.3%', direction: 'up',   sparkData: [40,42,45,48,50,52,55,53,56,58,60,62,58,60,63,65,62,64,66,68] },
      { name: 'USD/CHF', price: '0.8891', delta: '▼ -0.1%', direction: 'down', sparkData: [60,58,56,54,52,55,53,51,49,47,50,48,46,44,42,45,43,41,39,37] },
      { name: 'AUD/USD', price: '0.6523', delta: '▼ -0.4%', direction: 'down', sparkData: [65,62,60,58,55,52,50,54,56,52,48,45,48,52,50,46,44,42,40,38] },
      { name: 'USD/CAD', price: '1.3612', delta: '▲ +0.2%', direction: 'up',   sparkData: [45,48,50,52,55,53,56,58,60,62,58,60,63,65,62,64,66,68,65,67] },
    ],
  },
  {
    title: 'Forex Geopolitical', icon: '🏛️',
    items: [
      { name: 'USD/CNY', price: '7.2841', delta: '▲ +0.1%', direction: 'up',   sparkData: [50,52,54,56,58,55,57,59,61,63,60,62,64,66,68,65,67,69,71,68] },
      { name: 'USD/RUB', price: '96.42',  delta: '▼ -0.3%', direction: 'down', sparkData: [70,68,65,62,60,63,65,62,58,55,58,60,56,54,52,55,53,50,48,46] },
      { name: 'USD/TRY', price: '36.21',  delta: '▲ +0.5%', direction: 'up',   sparkData: [30,35,38,42,45,48,50,52,55,58,60,62,65,68,70,72,75,78,80,82] },
      { name: 'USD/ARS', price: '1,052',  delta: '▲ +0.2%', direction: 'up',   sparkData: [35,38,42,45,48,50,52,55,58,60,62,65,68,70,72,75,78,80,82,85] },
      { name: 'USD/BRL', price: '5.94',   delta: '▲ +0.8%', direction: 'up',   sparkData: [40,45,48,50,52,55,58,60,62,65,68,70,72,75,78,80,82,85,88,90] },
      { name: 'USD/MXN', price: '20.45',  delta: '▲ +0.3%', direction: 'up',   sparkData: [50,52,54,56,58,55,57,59,61,63,60,62,64,66,68,65,67,69,71,68] },
      { name: 'USD/UAH', price: '41.52',  delta: '▬ 0.0%',  direction: 'flat', sparkData: [50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50] },
      { name: 'USD/ILS', price: '3.72',   delta: '▲ +0.4%', direction: 'up',   sparkData: [45,48,50,52,55,53,56,58,60,62,58,60,63,65,62,64,66,68,70,72] },
      { name: 'USD/IRR', price: '42,000', delta: '▬ 0.0%',  direction: 'flat', sparkData: [50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50] },
      { name: 'EUR/CHF', price: '0.9634', delta: '▼ -0.1%', direction: 'down', sparkData: [60,58,56,54,52,55,53,51,49,47,50,48,46,44,42,45,43,41,39,37] },
    ],
  },
];

export const mockCDS: CDSSpread[] = [
  { country: 'USA',          code: 'US', spread5Y: 38,   change: -1,  direction: 'down', rating: 'AA+' },
  { country: 'Germany',      code: 'DE', spread5Y: 18,   change: 0,   direction: 'flat', rating: 'AAA' },
  { country: 'UK',           code: 'GB', spread5Y: 28,   change: 1,   direction: 'flat', rating: 'AA' },
  { country: 'Japan',        code: 'JP', spread5Y: 25,   change: -2,  direction: 'down', rating: 'A+' },
  { country: 'China',        code: 'CN', spread5Y: 68,   change: 3,   direction: 'up',   rating: 'A+' },
  { country: 'India',        code: 'IN', spread5Y: 95,   change: -1,  direction: 'down', rating: 'BBB-' },
  { country: 'Brazil',       code: 'BR', spread5Y: 145,  change: 5,   direction: 'up',   rating: 'BB' },
  { country: 'Mexico',       code: 'MX', spread5Y: 110,  change: 2,   direction: 'up',   rating: 'BBB' },
  { country: 'S. Africa',    code: 'ZA', spread5Y: 215,  change: -3,  direction: 'down', rating: 'BB-' },
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
