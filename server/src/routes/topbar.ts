import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { Conflict, MarketSection, MacroItem, TopBarData, TopBarKPI, CyberThreatPulse } from '../types.js';

function findMarketPrice(sections: MarketSection[], sectionTitle: string, itemName: string, fallback: string): string {
  const section = sections.find(s => s.title === sectionTitle);
  const item = section?.items.find(i => i.name === itemName);
  return item?.price ?? fallback;
}

function findForexRate(forex: MarketSection[], pair: string, fallback: string): string {
  for (const section of forex) {
    const item = section.items.find(i => i.name === pair);
    if (item) return item.price;
  }
  return fallback;
}

function computeTopbar(tab?: string): TopBarData {
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const sections = cache.get<MarketSection[]>('markets') ?? [];
  const forex = cache.get<MarketSection[]>('forex') ?? [];
  const macro = cache.get<MacroItem[]>('macro') ?? [];
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
  const threatLevel = criticalConflicts >= 3 ? 'HIGH' : criticalConflicts >= 2 ? 'ELEVATED' : 'GUARDED';

  let kpis: TopBarKPI[];

  switch (tab) {
    case 'mideast': {
      const oilPrice = findMarketPrice(sections, 'Energy', 'WTI OIL', '—');
      const goldPrice = findMarketPrice(sections, 'Precious Metals', 'GOLD', '—');
      const silverPrice = findMarketPrice(sections, 'Precious Metals', 'SILVER', '—');
      kpis = [
        { label: 'WTI Oil', value: oilPrice, colorClass: 'text-medium' },
        { label: 'Gold', value: goldPrice, colorClass: 'text-positive' },
        { label: 'Silver', value: silverPrice, colorClass: 'text-medium' },
      ];
      break;
    }
    case 'ukraine': {
      const daysSinceInvasion = Math.floor((Date.now() - new Date('2022-02-24').getTime()) / 86400000);
      const rubRate = findForexRate(forex, 'USD/RUB', '—');
      const moex = findMarketPrice(sections, 'Europe', 'MOEX', '—');
      const ukraineEvents = conflicts.filter(c => c.region.toLowerCase().includes('ukraine')).length;
      const acledStr = ukraineEvents > 0 ? ukraineEvents.toString() : '—';
      kpis = [
        { label: 'Day of War', value: `Day ${daysSinceInvasion}`, colorClass: 'text-critical' },
        { label: 'ACLED Events', value: acledStr, colorClass: 'text-high' },
        { label: 'RUB/USD', value: rubRate, colorClass: 'text-medium' },
        { label: 'MOEX', value: moex, colorClass: 'text-text-primary' },
      ];
      break;
    }
    case 'domestic': {
      const sp500 = findMarketPrice(sections, 'Americas', 'S&P 500', '—');
      const dji = findMarketPrice(sections, 'Americas', 'DOW JONES', '—');
      const dogeSavings = macro.find(m => m.label.includes('DOGE'))?.value ?? '—';
      kpis = [
        { label: 'S&P 500', value: sp500, colorClass: 'text-positive' },
        { label: 'DOW', value: dji, colorClass: 'text-positive' },
        { label: 'DOGE Savings', value: dogeSavings, colorClass: 'text-medium' },
      ];
      break;
    }
    case 'intel':
    case 'cyber': {
      const cyberThreats = cache.get<CyberThreatPulse[]>('cyber_threats');

      const activeThreats = cyberThreats ? cyberThreats.length.toString() : '—';
      const criticalThreats = cyberThreats
        ? cyberThreats.filter(t => t.severity === 'critical').length.toString()
        : '—';
      const aptGroups = cyberThreats
        ? new Set(cyberThreats.map(t => t.adversary).filter(Boolean)).size.toString()
        : '—';

      kpis = [
        { label: 'Active Threats', value: activeThreats, colorClass: 'text-critical' },
        { label: 'Critical', value: criticalThreats, colorClass: 'text-high' },
        { label: 'APT Groups', value: aptGroups, colorClass: 'text-medium' },
      ];
      break;
    }
    default: {
      // global
      const btcPrice = findMarketPrice(sections, 'Crypto', 'BITCOIN', '—');
      const oilPrice = findMarketPrice(sections, 'Energy', 'WTI OIL', '—');
      kpis = [
        { label: 'Active Conflicts', value: conflicts.length.toString(), colorClass: 'text-critical' },
        { label: 'Critical', value: criticalConflicts.toString(), colorClass: 'text-critical' },
        { label: 'BTC', value: btcPrice, colorClass: 'text-positive' },
        { label: 'WTI Oil', value: oilPrice, colorClass: 'text-medium' },
      ];
      break;
    }
  }

  return { kpis, threatLevel };
}

const VALID_TABS = new Set(['global', 'mideast', 'ukraine', 'domestic', 'cyber', 'intel']);

export function registerTopbarRoutes(app: FastifyInstance) {
  app.get('/api/topbar', async (req) => {
    const { tab } = req.query as { tab?: string };
    const safeTab = tab && VALID_TABS.has(tab) ? tab : undefined;
    return computeTopbar(safeTab);
  });
}
