import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { ARMED_GROUPS_BASE } from '../data/armed_groups.js';
import type { ArmedGroup } from '../types.js';

export async function fetchArmedGroups(): Promise<void> {
  console.log('[ARMED_GROUPS] Enriching armed group data...');

  try {
    const actorCounts = cache.get<Record<string, number>>('acled_actors');

    // Pre-index actors lowercase once to avoid repeated toLowerCase on every group
    const actorEntries = actorCounts
      ? Object.entries(actorCounts).map(([actor, count]) => [actor.toLowerCase(), count] as const)
      : [];

    const enriched: ArmedGroup[] = ARMED_GROUPS_BASE.map((group) => {
      let recentEvents = 0;

      if (actorEntries.length > 0 && group.acledActorNames) {
        for (const actorName of group.acledActorNames) {
          const lowerName = actorName.toLowerCase();
          for (const [actorLower, count] of actorEntries) {
            if (actorLower.includes(lowerName)) {
              recentEvents += count;
            }
          }
        }
      }

      return {
        ...group,
        recentEvents,
      };
    });

    cache.set('armed_groups', enriched, TTL.ARMED_GROUPS);
    console.log(`[ARMED_GROUPS] ${enriched.length} armed groups cached`);
  } catch (err) {
    console.error('[ARMED_GROUPS] Enrichment failed:', err);
  }
}
