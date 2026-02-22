import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { ExecutiveOrder } from '../types.js';

export function registerExecutiveOrdersRoutes(app: FastifyInstance) {
  app.get('/api/executive-orders', async (req) => {
    return respondWithMeta('executive_orders', req.query as Record<string, string>);
  });
}
