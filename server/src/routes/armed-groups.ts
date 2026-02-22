import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';
import type { ArmedGroup } from '../types.js';

export function registerArmedGroupsRoutes(app: FastifyInstance) {
  app.get('/api/armed-groups', async (req) => {
    return respondWithMeta('armed_groups', req.query as Record<string, string>);
  });

  app.get<{ Params: { id: string } }>('/api/armed-groups/:id', async (req, reply) => {
    const id = req.params.id;
    if (id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      reply.status(400);
      return { error: 'Invalid group ID format' };
    }
    const groups = cache.get<ArmedGroup[]>('armed_groups') ?? [];
    const group = groups.find((g) => g.id === id);
    if (!group) {
      reply.status(404);
      return { error: 'Armed group not found' };
    }
    return group;
  });
}
