import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { COUNTRY_PROFILES } from '../data/countries.js';
import type { CountryProfile, Conflict, ArmedGroup } from '../types.js';

export async function fetchCountries(): Promise<void> {
  console.log('[COUNTRIES] Enriching country profiles from cache...');

  try {
    // Get cached data for enrichment (no new API calls)
    const conflicts = cache.get<Conflict[]>('conflicts');
    const actorCounts = cache.get<Record<string, number>>('acled_actors');

    // Build lookup maps for O(1) enrichment
    const conflictsByCountry = new Map<string, number>();
    if (conflicts) {
      for (const c of conflicts) {
        const existing = conflictsByCountry.get(c.name) ?? 0;
        conflictsByCountry.set(c.name, existing + 1);
      }
    }

    // Count events by country name from ACLED actors
    // Pre-index actors lowercase once to avoid O(N*M) repeated toLowerCase calls
    const eventsByCountry = new Map<string, number>();
    if (actorCounts) {
      const actorEntries = Object.entries(actorCounts).map(
        ([actor, count]) => [actor.toLowerCase(), count] as const
      );
      for (const profile of COUNTRY_PROFILES) {
        const countryLower = profile.name.toLowerCase();
        let totalEvents = 0;
        for (const [actorLower, count] of actorEntries) {
          if (actorLower.includes(countryLower)) {
            totalEvents += count;
          }
        }
        if (totalEvents > 0) {
          eventsByCountry.set(profile.code, totalEvents);
        }
      }
    }

    // Count armed groups per country
    const armedGroups = cache.get<ArmedGroup[]>('armed_groups');
    const armedGroupsByCountry = new Map<string, number>();
    if (armedGroups) {
      for (const group of armedGroups) {
        for (const code of group.countries) {
          armedGroupsByCountry.set(code, (armedGroupsByCountry.get(code) ?? 0) + 1);
        }
      }
    }

    // Enrich profiles
    const enriched: CountryProfile[] = COUNTRY_PROFILES.map((profile) => ({
      ...profile,
      activeConflicts: conflictsByCountry.get(profile.name) ?? 0,
      recentEvents: eventsByCountry.get(profile.code) ?? 0,
      armedGroupCount: armedGroupsByCountry.get(profile.code) ?? 0,
    }));

    cache.set('countries', enriched, TTL.COUNTRIES);
    console.log(`[COUNTRIES] ${enriched.length} country profiles cached`);
  } catch (err) {
    console.error('[COUNTRIES] Enrichment failed:', err);
  }
}
