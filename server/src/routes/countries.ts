import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockCountries } from '../mock/countries.js';
import type { CountryProfile } from '../types.js';

export function registerCountriesRoutes(app: FastifyInstance) {
  app.get('/api/countries', async () => {
    return cache.get<CountryProfile[]>('countries') ?? mockCountries;
  });

  app.get<{ Params: { code: string } }>('/api/countries/:code', async (req, reply) => {
    const countries = cache.get<CountryProfile[]>('countries') ?? mockCountries;
    const country = countries.find((c) => c.code.toUpperCase() === req.params.code.toUpperCase());
    if (!country) {
      reply.status(404);
      return { error: 'Country not found' };
    }
    return country;
  });
}
