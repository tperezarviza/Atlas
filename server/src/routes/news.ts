import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { NewsPoint } from '../types.js';

export function registerNewsRoutes(app: FastifyInstance) {
  app.get('/api/news', async (req) => {
    return respondWithMeta('news', req.query as Record<string, string>);
  });
}
