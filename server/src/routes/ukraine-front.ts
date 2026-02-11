import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockUkraineFront } from '../mock/ukraine-front.js';
import type { UkraineFrontData } from '../types.js';

export function registerUkraineFrontRoutes(app: FastifyInstance) {
  app.get('/api/ukraine-front', async () => {
    return cache.get<UkraineFrontData>('ukraine_front') ?? mockUkraineFront;
  });
}
