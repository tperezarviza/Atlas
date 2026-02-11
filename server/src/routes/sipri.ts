import type { FastifyInstance } from 'fastify';
import { SIPRI_ARMS_TRANSFERS } from '../data/sipri_arms.js';
import { SIPRI_MILITARY_SPENDING } from '../data/sipri_milex.js';

export function registerSipriRoutes(app: FastifyInstance) {
  app.get('/api/arms-transfers', async () => {
    return SIPRI_ARMS_TRANSFERS;
  });

  app.get('/api/military-spending', async () => {
    return SIPRI_MILITARY_SPENDING;
  });
}
