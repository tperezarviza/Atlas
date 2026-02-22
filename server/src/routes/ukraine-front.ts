import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';
import type { UkraineFrontData } from '../types.js';

export function registerUkraineFrontRoutes(app: FastifyInstance) {
  app.get('/api/ukraine-front', async (req) => {
    return respondWithMeta('ukraine_front', req.query as Record<string, string>);
  });
}
