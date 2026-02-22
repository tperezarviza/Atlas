import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { Chokepoint } from '../types.js';

export function registerShippingRoutes(app: FastifyInstance) {
  app.get('/api/shipping', async (req) => {
    return respondWithMeta('shipping', req.query as Record<string, string>);
  });
}
