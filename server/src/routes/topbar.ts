import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockConflicts } from '../mock/conflicts.js';
import { mockMarketSections, mockBorderStats } from '../mock/markets.js';
import type { Conflict, MarketSection, BorderStat, TopBarData } from '../types.js';

function computeTopbar(): TopBarData {
  const conflicts = cache.get<Conflict[]>('conflicts') ?? mockConflicts;
  const sections = cache.get<MarketSection[]>('markets') ?? mockMarketSections;
  const border = cache.get<BorderStat[]>('border') ?? mockBorderStats;

  const activeConflicts = conflicts.length;
  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical').length;

  // Find BTC price from crypto section
  const cryptoSection = sections.find((s) => s.title === 'Crypto');
  const btcItem = cryptoSection?.items.find((i) => i.name === 'BITCOIN');
  const btcPrice = btcItem?.price ?? '$97,234';

  // Find Oil price from energy section
  const energySection = sections.find((s) => s.title === 'Energy');
  const oilItem = energySection?.items.find((i) => i.name === 'WTI OIL');
  const oilPrice = oilItem?.price ?? '$72.34';

  // Border encounters
  const encounterStat = border.find((b) => b.label.includes('Encounters'));
  const borderEncounters = encounterStat?.value ?? '30,561';

  // Threat level based on critical conflicts
  const threatLevel = criticalConflicts >= 3 ? 'HIGH' : criticalConflicts >= 2 ? 'ELEVATED' : 'GUARDED';

  return {
    activeConflicts,
    criticalConflicts,
    btcPrice,
    oilPrice,
    borderEncounters,
    threatLevel,
  };
}

export function registerTopbarRoutes(app: FastifyInstance) {
  app.get('/api/topbar', async () => {
    return computeTopbar();
  });
}
