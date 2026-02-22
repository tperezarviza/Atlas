import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { getMarketSessions } from '../services/sessions.js';
import type { MarketSection, MacroItem } from '../types.js';

export function registerMarketsRoutes(app: FastifyInstance) {
  app.get('/api/markets', async (req) => {
    return {
      sections: cache.get<MarketSection[]>('markets') ?? [],
      forex: cache.get<MarketSection[]>('forex') ?? [],
      sessions: getMarketSessions(),
      macro: cache.get<MacroItem[]>('macro') ?? [],
    };
  });
}
