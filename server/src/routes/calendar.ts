import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { CalendarEvent } from '../types.js';

export function registerCalendarRoutes(app: FastifyInstance) {
  app.get('/api/calendar', async () => {
    const calendarEvents = cache.get<CalendarEvent[]>('calendar') ?? [];
    const unscEvents = cache.get<CalendarEvent[]>('unsc_calendar') ?? [];
    return [...calendarEvents, ...unscEvents];
  });
}
