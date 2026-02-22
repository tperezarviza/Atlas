import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { redisGet, redisSet } from '../redis.js';
import { aiComplete } from '../utils/ai-client.js';
import type { NewsPoint, FeedItem, TwitterIntelItem, Conflict, HostilityPair, InternetIncident } from '../types.js';

export interface FocalPoint {
  entity: string;            // "Iran", "IRGC", "Zelensky", etc.
  entityType: 'country' | 'organization' | 'person' | 'event';
  score: number;             // composite focal score
  sources: {                 // which source types mention this entity
    type: string;            // 'gdelt' | 'rss' | 'twitter' | 'acled' | 'hostility' | 'ooni'
    count: number;
    sample: string;          // one example headline/text
  }[];
  sourceTypeCount: number;   // how many DIFFERENT source types (the key metric)
  trend: 'new' | 'rising' | 'stable' | 'falling';
  firstSeen: string;         // ISO date when first detected
  updatedAt: string;
}

// Use AI to extract entities from a batch of headlines (Haiku — mechanical NER task)
async function extractEntities(headlines: string[]): Promise<{ name: string; type: string }[]> {
  if (headlines.length === 0) return [];

  try {
    const response = await aiComplete(
      `You are a named entity extraction system for geopolitical intelligence. Extract entities from headlines.
Return ONLY a JSON array of objects with "name" (canonical English name) and "type" (country|organization|person|event).
Normalize country names to English (e.g., "Türkiye" → "Turkey"). Merge aliases (e.g., "IDF" + "Israel Defense Forces" → entity "IDF", type "organization").
Focus on: countries, military organizations, political leaders, terrorist groups, international orgs, specific crises/events.
Skip generic terms like "officials", "sources", "analysts".`,
      `Extract named entities from these intelligence headlines:\n\n${headlines.join('\n')}`,
      { preferHaiku: true, maxTokens: 1000 },
    );

    console.log(`[FOCAL] NER via ${response.provider} in ${response.latencyMs}ms`);

    // Parse JSON (handle fenced code blocks)
    let cleaned = response.text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((e: any) => e.name && e.type)
      .map((e: any) => ({
        name: String(e.name).trim(),
        type: String(e.type).toLowerCase(),
      }));
  } catch (err) {
    console.warn('[FOCAL] NER extraction failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function detectFocalPoints(): Promise<void> {
  // BQ GKG disabled: 1.28 TB/query = $32/day. Claude NER fallback is $0.005/call.

  console.log('[FOCAL] Detecting focal points...');

  try {
    // Gather headlines from all sources
    const news = cache.get<NewsPoint[]>('news') ?? [];
    const feed = cache.get<FeedItem[]>('feed') ?? [];
    const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
    const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
    const hostility = cache.get<HostilityPair[]>('hostility') ?? [];
    const ooni = cache.get<InternetIncident[]>('ooni') ?? [];

    // Collect top headlines for NER (limit to save tokens)
    const topHeadlines = [
      ...news.sort((a, b) => a.tone - b.tone).slice(0, 20).map(n => n.headline),
      ...feed.slice(0, 10).map(f => f.text.slice(0, 150)),
      ...tweets.filter(t => t.priority === 'flash' || t.priority === 'urgent').slice(0, 10).map(t => t.text.slice(0, 150)),
    ];

    // Run NER on combined headlines (one API call)
    const entities = await extractEntities(topHeadlines.slice(0, 40));

    // Build entity → sources map
    const entityMap = new Map<string, {
      type: string;
      sources: Map<string, { count: number; sample: string }>;
    }>();

    // Process NER results against each source
    for (const entity of entities) {
      const key = entity.name.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, { type: entity.type, sources: new Map() });
      }
      const entry = entityMap.get(key)!;

      // Check each source type for mentions
      const pattern = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, 'i');

      const gdeltHits = news.filter(n => pattern.test(n.headline));
      if (gdeltHits.length > 0) {
        entry.sources.set('gdelt', { count: gdeltHits.length, sample: gdeltHits[0].headline });
      }

      const rssHits = feed.filter(f => pattern.test(f.text));
      if (rssHits.length > 0) {
        entry.sources.set('rss', { count: rssHits.length, sample: rssHits[0].text.slice(0, 120) });
      }

      const twitterHits = tweets.filter(t => pattern.test(t.text));
      if (twitterHits.length > 0) {
        entry.sources.set('twitter', { count: twitterHits.length, sample: twitterHits[0].text.slice(0, 120) });
      }

      const acledHits = conflicts.filter(c => pattern.test(c.name) || pattern.test(c.region));
      if (acledHits.length > 0) {
        entry.sources.set('acled', { count: acledHits.length, sample: acledHits[0].name });
      }

      const hostilityHits = hostility.filter(h => pattern.test(h.countryA) || pattern.test(h.countryB));
      if (hostilityHits.length > 0) {
        entry.sources.set('hostility', { count: hostilityHits.length, sample: `${hostilityHits[0].countryA}-${hostilityHits[0].countryB}: tone ${hostilityHits[0].avgTone}` });
      }

      const ooniHits = ooni.filter(i => pattern.test(i.country));
      if (ooniHits.length > 0) {
        entry.sources.set('ooni', { count: ooniHits.length, sample: `Shutdown in ${ooniHits[0].country}` });
      }
    }

    // Get previous focal points from Redis for trend comparison
    const previousFocals = await redisGet<FocalPoint[]>('focal:previous') ?? [];
    const prevMap = new Map(previousFocals.map(f => [f.entity.toLowerCase(), f]));

    // Convert to FocalPoint objects, filter by sourceTypeCount >= 2
    const focalPoints: FocalPoint[] = [];

    for (const [key, entry] of entityMap) {
      if (entry.sources.size < 2) continue; // must appear in 2+ source types

      const sources = Array.from(entry.sources.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        sample: data.sample,
      }));

      // Score formula
      const score = sources.reduce((sum, s) => {
        const weight = s.type === 'gdelt' ? 2 : s.type === 'twitter' ? 1.5 : s.type === 'acled' ? 3 : s.type === 'hostility' ? 2.5 : 1;
        return sum + s.count * weight;
      }, 0) + entry.sources.size * 5; // bonus for source diversity

      // Trend
      const prev = prevMap.get(key);
      let trend: FocalPoint['trend'] = 'new';
      if (prev) {
        const scoreDiff = score - prev.score;
        if (scoreDiff > 5) trend = 'rising';
        else if (scoreDiff < -5) trend = 'falling';
        else trend = 'stable';
      }

      focalPoints.push({
        entity: entities.find(e => e.name.toLowerCase() === key)?.name ?? key,
        entityType: entry.type as FocalPoint['entityType'],
        score: Math.round(score),
        sources,
        sourceTypeCount: entry.sources.size,
        trend,
        firstSeen: prev?.firstSeen ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Sort by score descending, take top 15
    focalPoints.sort((a, b) => b.score - a.score);
    const top = focalPoints.slice(0, 15);

    // Save current as "previous" for next cycle
    await redisSet('focal:previous', top, 24 * 3600);

    await cache.setWithRedis('focal_points', top, TTL.FOCAL_POINTS, 25200); // 7h Redis TTL
    console.log(`[FOCAL] ${top.length} focal points detected. Top: ${top.slice(0, 3).map(f => `${f.entity}(${f.score})`).join(', ')}`);
  } catch (err) {
    console.error('[FOCAL] Detection failed:', err instanceof Error ? err.message : err);
  }
}
