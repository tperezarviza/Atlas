import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { CountryProfile } from '../types.js';

export function registerCountriesRoutes(app: FastifyInstance) {
  app.get('/api/countries', async () => {
    return cache.get<CountryProfile[]>('countries') ?? [];
  });

  app.get<{ Params: { code: string } }>('/api/countries/:code', async (req, reply) => {
    const code = req.params.code;
    if (code.length > 3 || !/^[A-Za-z]+$/.test(code)) {
      reply.status(400);
      return { error: 'Invalid country code format' };
    }
    const countries = cache.get<CountryProfile[]>('countries') ?? [];
    const country = countries.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!country) {
      reply.status(404);
      return { error: 'Country not found' };
    }
    return country;
  });
}
