import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockPropaganda } from '../mock/propaganda.js';
import type { PropagandaEntry } from '../types.js';

export function registerPropagandaRoutes(app: FastifyInstance) {
  app.get('/api/propaganda', async () => {
    return cache.get<PropagandaEntry[]>('propaganda') ?? mockPropaganda;
  });

  app.get<{ Params: { country: string } }>('/api/propaganda/:country', async (req, reply) => {
    const entries = cache.get<PropagandaEntry[]>('propaganda') ?? mockPropaganda;
    const entry = entries.find((e) => e.countryCode.toUpperCase() === req.params.country.toUpperCase());
    if (!entry) {
      reply.status(404);
      return { error: 'Propaganda data not found for country' };
    }
    return entry;
  });
}
