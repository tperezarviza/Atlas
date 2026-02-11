import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockConflicts } from '../mock/conflicts.js';
import type { Conflict } from '../types.js';

export function registerConflictsRoutes(app: FastifyInstance) {
  app.get('/api/conflicts', async () => {
    return cache.get<Conflict[]>('conflicts') ?? mockConflicts;
  });
}
