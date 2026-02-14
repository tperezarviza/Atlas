import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { Chokepoint } from '../types.js';

export function registerShippingRoutes(app: FastifyInstance) {
  app.get('/api/shipping', async () => {
    return cache.get<Chokepoint[]>('shipping') ?? [];
  });
}
