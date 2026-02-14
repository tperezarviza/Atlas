import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { EconomicEvent } from '../types.js';

export function registerEconomicCalendarRoutes(app: FastifyInstance) {
  app.get('/api/economic-calendar', async (req, reply) => {
    const events = cache.get<EconomicEvent[]>('economic_calendar') ?? [];
    const currency = (req.query as Record<string, string>).currency?.toUpperCase();
    if (currency) {
      if (!/^[A-Z]{3}$/.test(currency)) {
        return reply.code(400).send({ error: 'Invalid currency code (expected 3-letter ISO)' });
      }
      return events.filter(e => e.currency === currency);
    }
    return events;
  });
}
