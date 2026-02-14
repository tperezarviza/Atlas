import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockCyber } from '../mock/cyber.js';
import { buildCyberIntelligence } from '../services/cyber.js';
import type { CyberThreatPulse, ShodanIntelligence, CyberIntelligence } from '../types.js';

export function registerCyberRoutes(app: FastifyInstance) {
  app.get('/api/cyber', async () => {
    const built = buildCyberIntelligence();
    // Return built if it has data, otherwise mock
    if (built.active_threats.length > 0 || built.infrastructure_exposure.length > 0) {
      return built;
    }
    return mockCyber;
  });

  app.get('/api/cyber/threats', async () => {
    return cache.get<CyberThreatPulse[]>('cyber_threats') ?? mockCyber.active_threats;
  });

  app.get('/api/cyber/infrastructure', async () => {
    return cache.get<ShodanIntelligence[]>('cyber_infra') ?? mockCyber.infrastructure_exposure;
  });
}
