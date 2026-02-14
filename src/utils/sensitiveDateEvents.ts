import { sensitiveDates } from '../data/sensitiveDates';
import type { CalendarEvent, CalendarUrgency } from '../types';

/**
 * Returns CalendarEvent[] for sensitive dates within ±15 days of now.
 * Handles year boundaries correctly (e.g., Dec 28 → Jan 3).
 */
export function getSensitiveDateEvents(): CalendarEvent[] {
  const now = new Date();
  const todayMs = now.getTime();
  const currentYear = now.getFullYear();

  return sensitiveDates
    .filter(sd => {
      // Build actual Date objects for this year and adjacent years
      // to correctly handle Dec→Jan and Jan→Dec boundaries
      for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
        const sdDate = new Date(year, sd.month - 1, sd.day);
        const diffDays = (sdDate.getTime() - todayMs) / 86_400_000;
        if (diffDays >= -5 && diffDays <= 15) return true;
      }
      return false;
    })
    .map(sd => {
      // Compute the nearest occurrence for urgency
      let minAbsDiff = Infinity;
      for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
        const sdDate = new Date(year, sd.month - 1, sd.day);
        const diffDays = Math.abs((sdDate.getTime() - todayMs) / 86_400_000);
        if (diffDays < minAbsDiff) minAbsDiff = diffDays;
      }
      return {
        id: `sensitive-${sd.month}-${sd.day}`,
        date: `${sd.month}/${sd.day}`,
        title: `📌 ${sd.title}`,
        detail: sd.detail,
        urgency: (minAbsDiff <= 2 ? 'today' : 'soon') as CalendarUrgency,
      };
    });
}
