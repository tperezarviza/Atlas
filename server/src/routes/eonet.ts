import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockNaturalEvents } from '../mock/eonet.js';
import type { NaturalEvent } from '../types.js';

const VALID_CATEGORIES = new Set([
  'Wildfires', 'Severe Storms', 'Volcanoes', 'Earthquakes',
  'Floods', 'Sea & Lake Ice', 'Drought', 'Landslides',
  'Dust & Haze', 'Snow', 'Temperature Extremes', 'Water Color', 'Man-Made',
]);

export function registerEonetRoutes(app: FastifyInstance) {
  app.get('/api/natural-events', async (req, reply) => {
    const events = cache.get<NaturalEvent[]>('natural_events') ?? mockNaturalEvents;
    const category = (req.query as Record<string, string>).category;
    if (category) {
      if (!VALID_CATEGORIES.has(category)) {
        return reply.code(400).send({ error: 'Invalid category', valid: [...VALID_CATEGORIES] });
      }
      return events.filter(e => e.category === category);
    }
    return events;
  });
}
