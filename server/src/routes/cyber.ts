import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import { buildCyberIntelligence } from '../services/cyber.js';
import type { CyberThreatPulse } from '../types.js';

export function registerCyberRoutes(app: FastifyInstance) {
  app.get('/api/cyber', async (req) => {
    return buildCyberIntelligence();
  });

  app.get('/api/cyber/threats', async (req) => {
    return respondWithMeta('cyber_threats', req.query as Record<string, string>);
  });
}
