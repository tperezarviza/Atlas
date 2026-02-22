import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';

export function registerFirmsRoutes(app: FastifyInstance) {
  app.get('/api/fire-hotspots', async (req) => respondWithMeta('fire_hotspots', req.query as Record<string, string>));
}
