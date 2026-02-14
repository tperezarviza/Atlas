import type { EconomicEvent } from '../types.js';

export const mockEconomicCalendar: EconomicEvent[] = [
  { date: 'Feb 12', time: '8:30am', currency: 'USD', impact: 'high', event_name: 'CPI m/m', forecast: '0.3%', previous: '0.4%' },
  { date: 'Feb 12', time: '8:30am', currency: 'USD', impact: 'high', event_name: 'Core CPI m/m', forecast: '0.3%', previous: '0.2%' },
  { date: 'Feb 13', time: '8:30am', currency: 'USD', impact: 'medium', event_name: 'Unemployment Claims', forecast: '218K', previous: '219K' },
  { date: 'Feb 13', time: '8:30am', currency: 'USD', impact: 'high', event_name: 'PPI m/m', forecast: '0.2%', previous: '0.2%' },
  { date: 'Feb 14', time: '8:30am', currency: 'USD', impact: 'high', event_name: 'Retail Sales m/m', forecast: '0.1%', previous: '0.4%' },
  { date: 'Feb 14', time: 'All Day', currency: 'EUR', impact: 'high', event_name: 'Flash GDP q/q', forecast: '0.0%', previous: '0.0%' },
  { date: 'Feb 18', time: 'Tentative', currency: 'JPY', impact: 'high', event_name: 'BOJ Policy Rate', forecast: '0.50%', previous: '0.50%' },
  { date: 'Feb 19', time: '2:00pm', currency: 'USD', impact: 'high', event_name: 'FOMC Meeting Minutes' },
  { date: 'Feb 20', time: '8:30am', currency: 'USD', impact: 'medium', event_name: 'Philly Fed Manufacturing Index', forecast: '-5.2', previous: '-10.6' },
  { date: 'Feb 21', time: '9:45am', currency: 'USD', impact: 'high', event_name: 'Flash Manufacturing PMI', forecast: '50.1', previous: '51.2' },
];
