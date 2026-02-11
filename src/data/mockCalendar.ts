import type { CalendarEvent } from '../types';

export const mockCalendar: CalendarEvent[] = [
  { id: 'e1', date: 'TODAY · Feb 10', title: 'EU Foreign Affairs Council', detail: 'Brussels · Sanctions review on Russia & Iran', urgency: 'today' },
  { id: 'e2', date: 'Feb 12-13', title: 'NATO Defence Ministers Meeting', detail: 'Brussels · Ukraine aid package, burden sharing', urgency: 'soon' },
  { id: 'e3', date: 'Feb 14', title: 'UN Security Council — Sudan', detail: 'New York · Emergency session on Darfur humanitarian access', urgency: 'soon' },
  { id: 'e4', date: 'Feb 14-16', title: 'Munich Security Conference', detail: 'Munich · Zelensky keynote, Rubio attending', urgency: 'soon' },
  { id: 'e5', date: 'Feb 20', title: 'IAEA Board of Governors', detail: 'Vienna · Iran enrichment report review', urgency: 'soon' },
  { id: 'e6', date: 'Mar 1', title: 'OPEC+ Ministerial Meeting', detail: 'Vienna · Production quota decision', urgency: 'future' },
  { id: 'e7', date: 'Mar 18-19', title: 'Federal Reserve FOMC', detail: 'Washington · Rate decision', urgency: 'future' },
  { id: 'e8', date: 'Apr 14-20', title: 'IMF/World Bank Spring Meetings', detail: 'Washington · Global economic outlook', urgency: 'future' },
  { id: 'e9', date: 'Jun 15-17', title: 'G7 Summit', detail: 'Canada · Full agenda TBD', urgency: 'future' },
  { id: 'e10', date: 'Sep 16-22', title: 'UN General Assembly (UNGA 81)', detail: 'New York · World leaders week', urgency: 'future' },
];
