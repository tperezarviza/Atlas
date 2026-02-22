import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';

export function registerPolymarketRoutes(app: FastifyInstance) {
  app.get('/api/polymarket', async (req) => respondWithMeta('polymarket', req.query as Record<string, string>));
}
