import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockHostility } from '../mock/hostility.js';
import type { HostilityPair } from '../types.js';

export function registerHostilityRoutes(app: FastifyInstance) {
  app.get('/api/hostility', async () => {
    return cache.get<HostilityPair[]>('hostility') ?? mockHostility;
  });

  app.get<{ Params: { pair: string } }>('/api/hostility/:pair', async (req, reply) => {
    const pairs = cache.get<HostilityPair[]>('hostility') ?? mockHostility;
    const pair = pairs.find((p) => p.id === req.params.pair);
    if (!pair) {
      reply.status(404);
      return { error: 'Hostility pair not found' };
    }
    return pair;
  });
}
