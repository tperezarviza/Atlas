import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockMarketSections, mockMacro, mockBorderStats } from '../mock/markets.js';
import type { MarketSection, MacroItem, BorderStat } from '../types.js';

export function registerMarketsRoutes(app: FastifyInstance) {
  app.get('/api/markets', async () => {
    return {
      sections: cache.get<MarketSection[]>('markets') ?? mockMarketSections,
      macro: cache.get<MacroItem[]>('macro') ?? mockMacro,
      border: cache.get<BorderStat[]>('border') ?? mockBorderStats,
    };
  });
}
