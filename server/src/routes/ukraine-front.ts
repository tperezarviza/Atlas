import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { UkraineFrontData } from '../types.js';

export function registerUkraineFrontRoutes(app: FastifyInstance) {
  app.get('/api/ukraine-front', async () => {
    return cache.get<UkraineFrontData>('ukraine_front') ?? null;
  });
}
