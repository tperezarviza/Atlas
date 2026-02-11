import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockSanctions } from '../mock/sanctions.js';
import type { SanctionsResponse } from '../types.js';

export function registerSanctionsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { country?: string } }>('/api/sanctions', async (req) => {
    const data = cache.get<SanctionsResponse>('sanctions') ?? mockSanctions;

    if (req.query.country) {
      const country = req.query.country.toUpperCase();
      const filtered = {
        ...data,
        recentEntries: data.recentEntries.filter((e) =>
          e.country.toUpperCase().includes(country) ||
          e.programs.some((p) => p.toUpperCase().includes(country))
        ),
      };
      return filtered;
    }

    return data;
  });
}
