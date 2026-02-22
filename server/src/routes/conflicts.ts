import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { Conflict } from '../types.js';

export function registerConflictsRoutes(app: FastifyInstance) {
  app.get('/api/conflicts', async (req) => {
    return respondWithMeta('conflicts', req.query as Record<string, string>);
  });
}
