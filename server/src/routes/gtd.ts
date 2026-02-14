import type { FastifyInstance } from 'fastify';
import { GTD_SUMMARIES } from '../data/gtd_summary.js';

export function registerGtdRoutes(app: FastifyInstance) {
  app.get('/api/terrorism/history', async () => {
    return GTD_SUMMARIES;
  });

  app.get<{ Params: { group: string } }>('/api/terrorism/history/:group', async (req, reply) => {
    const raw = req.params.group;
    if (raw.length > 100 || !/^[a-zA-Z0-9\s\-'.()]+$/.test(raw)) {
      reply.status(400);
      return { error: 'Invalid group name' };
    }
    const search = raw.toLowerCase();
    // Try exact match first, then word-boundary match, then substring as fallback
    const group = GTD_SUMMARIES.find((g) => g.groupName.toLowerCase() === search)
      ?? GTD_SUMMARIES.find((g) => {
        const name = g.groupName.toLowerCase();
        return name.startsWith(search) || name.includes(` ${search}`) || name.includes(`(${search}`);
      })
      ?? GTD_SUMMARIES.find((g) => g.groupName.toLowerCase().includes(search));
    if (!group) {
      reply.status(404);
      return { error: 'Group not found' };
    }
    return group;
  });
}
