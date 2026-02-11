import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockArmedGroups } from '../mock/armedGroups.js';
import type { ArmedGroup } from '../types.js';

export function registerArmedGroupsRoutes(app: FastifyInstance) {
  app.get('/api/armed-groups', async () => {
    return cache.get<ArmedGroup[]>('armed_groups') ?? mockArmedGroups;
  });

  app.get<{ Params: { id: string } }>('/api/armed-groups/:id', async (req, reply) => {
    const groups = cache.get<ArmedGroup[]>('armed_groups') ?? mockArmedGroups;
    const group = groups.find((g) => g.id === req.params.id);
    if (!group) {
      reply.status(404);
      return { error: 'Armed group not found' };
    }
    return group;
  });
}
