import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { COUNTRY_PROFILES } from '../data/countries.js';
import type { CountryProfile, Conflict, ArmedGroup } from '../types.js';

// Map conflict names to ALL countries involved (not just the named country)
const CONFLICT_PARTICIPANTS: Record<string, string[]> = {
  'Ukraine': ['Ukraine', 'Russia'],
  'Palestine': ['Palestine', 'Israel'],
  'Syria': ['Syria', 'Turkey', 'Iran'],
  'Yemen': ['Yemen', 'Saudi Arabia', 'Iran'],
  'Sudan': ['Sudan'],
  'Myanmar': ['Myanmar'],
  'Somalia': ['Somalia'],
  'Mali': ['Mali'],
  'Burkina Faso': ['Burkina Faso'],
  'Ethiopia': ['Ethiopia'],
  'Nigeria': ['Nigeria'],
  'Haiti': ['Haiti'],
  'Democratic Republic of Congo': ['Democratic Republic of Congo'],
};

export async function fetchCountries(): Promise<void> {
  console.log('[COUNTRIES] Enriching country profiles from cache...');

  try {
    // Get cached data for enrichment (no new API calls)
    const conflicts = cache.get<Conflict[]>('conflicts');
    const actorCounts = cache.get<Record<string, number>>('acled_actors');

    // Build lookup: country name → number of conflicts it's involved in
    const conflictsByCountry = new Map<string, number>();
    if (conflicts) {
      for (const c of conflicts) {
        // Use participant map if available, otherwise just the conflict name
        const participants = CONFLICT_PARTICIPANTS[c.name] ?? [c.name];
        for (const country of participants) {
          conflictsByCountry.set(country, (conflictsByCountry.get(country) ?? 0) + 1);
        }
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
          // Word-boundary match to prevent Niger matching Nigeria etc.
          const countryRegex = new RegExp(`\\b${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          if (countryRegex.test(actorLower)) {
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

    await cache.setWithRedis('countries', enriched, TTL.COUNTRIES, 7200);
    console.log(`[COUNTRIES] ${enriched.length} country profiles cached`);
  } catch (err) {
    console.error('[COUNTRIES] Enrichment failed:', err);
  }
}
