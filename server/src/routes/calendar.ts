import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockCalendar } from '../mock/calendar.js';
import type { CalendarEvent } from '../types.js';

export function registerCalendarRoutes(app: FastifyInstance) {
  app.get('/api/calendar', async () => {
    return cache.get<CalendarEvent[]>('calendar') ?? mockCalendar;
  });
}
