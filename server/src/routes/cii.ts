import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';

export function registerCIIRoutes(app: FastifyInstance) {
  app.get('/api/cii', async (req) => respondWithMeta('cii', req.query as Record<string, string>));
}
