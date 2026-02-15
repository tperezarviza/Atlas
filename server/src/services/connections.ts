import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { isBigQueryAvailable } from './bigquery.js';
import { fetchConnectionsBQ } from './connections-bq.js';
import { aiComplete } from '../utils/ai-client.js';
import type { Connection, Conflict, ConnectionType } from '../types.js';

const VALID_TYPES: ConnectionType[] = ['proxy_war', 'arms_flow', 'alliance', 'spillover', 'military', 'cyber'];

const SYSTEM_PROMPT = `You are a geopolitical intelligence analyst. Given the following list of active conflicts, identify relationships between them. For each pair of related conflicts, specify:
- from: [lat, lng] of first conflict
- to: [lat, lng] of second conflict
- type: one of: ${VALID_TYPES.join(', ')}
- label: brief description (1 sentence)

Return ONLY a valid JSON array of objects with these fields: from, to, type, label.
No markdown, no code fences, no other text — just the raw JSON array.`;

/** Attempt to extract a JSON array from potentially messy AI output */
function parseConnectionsJSON(text: string): unknown[] | null {
  // 1. Try direct parse first (cleanest case)
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not clean JSON, try extraction */ }

  // 2. Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch { /* try next strategy */ }
  }

  // 3. Find outermost [ ... ] bracket pair
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch { /* extraction failed */ }
  }

  return null;
}

/** Validate a single connection entry has correct shape */
function isValidConnection(c: unknown): c is {
  from: [number, number];
  to: [number, number];
  type: string;
  label: string;
} {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;

  if (!Array.isArray(obj.from) || obj.from.length !== 2) return false;
  if (!Array.isArray(obj.to) || obj.to.length !== 2) return false;
  if (typeof obj.from[0] !== 'number' || typeof obj.from[1] !== 'number') return false;
  if (typeof obj.to[0] !== 'number' || typeof obj.to[1] !== 'number') return false;
  // Sanity check coords are valid lat/lng ranges
  if (Math.abs(obj.from[0]) > 90 || Math.abs(obj.from[1]) > 180) return false;
  if (Math.abs(obj.to[0]) > 90 || Math.abs(obj.to[1]) > 180) return false;
  if (typeof obj.type !== 'string') return false;
  if (typeof obj.label !== 'string') return false;

  return true;
}

export async function fetchConnections(): Promise<void> {
  // Prefer BQ GKG when available (billing attached — ~1.5GB/query, runs every 12h)
  if (isBigQueryAvailable()) {
    return fetchConnectionsBQ();
  }

  console.log('[CONNECTIONS] Generating conflict connections...');

  try {
    const conflicts = cache.get<Conflict[]>('conflicts') ?? [];

    const response = await aiComplete(
      SYSTEM_PROMPT,
      `Analyze these active conflicts and identify relationships:\n\n${JSON.stringify(conflicts.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, severity: c.severity, region: c.region })))}`,
      { maxTokens: 2000 },
    );

    console.log(`[CONNECTIONS] AI via ${response.provider} in ${response.latencyMs}ms`);

    const rawArray = parseConnectionsJSON(response.text);
    if (!rawArray) {
      console.warn('[CONNECTIONS] Could not parse AI response as JSON array');
      return;
    }

    const connections: Connection[] = rawArray
      .filter(isValidConnection)
      .filter((c) => VALID_TYPES.includes(c.type as ConnectionType))
      .map((c, i) => ({
        id: `ai-cn-${i}`,
        from: c.from as [number, number],
        to: c.to as [number, number],
        type: c.type as ConnectionType,
        label: c.label,
      }));

    if (connections.length === 0) {
      console.warn('[CONNECTIONS] AI returned 0 valid connections');
      return;
    }

    await cache.setWithRedis('connections', connections, TTL.CONNECTIONS, 12 * 3600);
    console.log(`[CONNECTIONS] ${connections.length} connections cached`);
  } catch (err) {
    console.error('[CONNECTIONS] Fetch failed:', err);
  }
}
