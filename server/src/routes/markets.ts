import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockMarketSections, mockMacro, mockBorderStats } from '../mock/markets.js';
import { mockForexSections, mockCDS } from '../mock/globalMarkets.js';
import { getMarketSessions } from '../services/sessions.js';
import type { MarketSection, MacroItem, BorderStat, CDSSpread } from '../types.js';

export function registerMarketsRoutes(app: FastifyInstance) {
  app.get('/api/markets', async () => {
    return {
      sections: cache.get<MarketSection[]>('markets') ?? mockMarketSections,
      forex: cache.get<MarketSection[]>('forex') ?? mockForexSections,
      sessions: getMarketSessions(),
      cds: cache.get<CDSSpread[]>('cds') ?? mockCDS,
      macro: cache.get<MacroItem[]>('macro') ?? mockMacro,
      border: cache.get<BorderStat[]>('border') ?? mockBorderStats,
    };
  });
}
