import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerPolymarketRoutes(app: FastifyInstance) {
  app.get('/api/polymarket', async () => cache.get('polymarket') ?? []);
}
