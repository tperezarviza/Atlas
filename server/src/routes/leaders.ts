import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { FeedItem } from '../types.js';

export function registerLeadersRoutes(app: FastifyInstance) {
  app.get('/api/leaders', async (req) => {
    return respondWithMeta('feed', req.query as Record<string, string>);
  });
}
