import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { PropagandaEntry } from '../types.js';

export function registerPropagandaRoutes(app: FastifyInstance) {
  app.get('/api/propaganda', async () => {
    return cache.get<PropagandaEntry[]>('propaganda') ?? [];
  });

  app.get<{ Params: { country: string } }>('/api/propaganda/:country', async (req, reply) => {
    const country = req.params.country;
    if (country.length > 3 || !/^[A-Za-z]+$/.test(country)) {
      reply.status(400);
      return { error: 'Invalid country code format' };
    }
    const entries = cache.get<PropagandaEntry[]>('propaganda') ?? [];
    const entry = entries.find((e) => e.countryCode.toUpperCase() === country.toUpperCase());
    if (!entry) {
      reply.status(404);
      return { error: 'Propaganda data not found for country' };
    }
    return entry;
  });
}
