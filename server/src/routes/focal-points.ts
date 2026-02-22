import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';

export function registerFocalPointsRoutes(app: FastifyInstance) {
  app.get('/api/focal-points', async (req) => respondWithMeta('focal_points', req.query as Record<string, string>));
}
