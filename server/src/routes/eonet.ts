import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { NaturalEvent } from '../types.js';

const VALID_CATEGORIES = new Set([
  'Wildfires', 'Severe Storms', 'Volcanoes', 'Earthquakes',
  'Floods', 'Sea & Lake Ice', 'Drought', 'Landslides',
  'Dust & Haze', 'Snow', 'Temperature Extremes', 'Water Color', 'Man-Made',
]);

export function registerEonetRoutes(app: FastifyInstance) {
  app.get('/api/natural-events', async (req, reply) => {
    const result = respondWithMeta('natural_events', req.query as Record<string, string>);
    const category = (req.query as Record<string, string>).category;
    if (category) {
      if (!VALID_CATEGORIES.has(category)) {
        return reply.code(400).send({ error: 'Invalid category', valid: [...VALID_CATEGORIES] });
      }
      const filtered = (Array.isArray(result.data) ? result.data : []).filter((e: any) => e.category === category);
      return { data: filtered, meta: result.meta };
    }
    return result;
  });
}
