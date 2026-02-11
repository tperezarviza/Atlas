import type { MarketSection, MacroItem, BorderStat } from '../types.js';

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
