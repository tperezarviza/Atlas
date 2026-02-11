import { parse } from 'csv-parse';
import { Readable } from 'node:stream';
import { TTL } from '../config.js';
import { cache } from '../cache.js';
import type { SanctionEntry, SanctionsResponse } from '../types.js';

const SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv';

const TARGET_PROGRAMS = new Set([
  'IRAN', 'SYRIA', 'RUSSIA', 'UKRAINE', 'DPRK', 'CUBA',
  'VENEZUELA', 'CHINA', 'BELARUS', 'YEMEN', 'SDGT',
]);

function matchesTargetProgram(programs: string): string[] {
  const matched: string[] = [];
  for (const prog of TARGET_PROGRAMS) {
    if (programs.toUpperCase().includes(prog)) {
      matched.push(prog);
    }
  }
  return matched;
}

export async function fetchSanctions(): Promise<void> {
  console.log('[SANCTIONS] Fetching OFAC SDN list...');

  try {
    const res = await fetch(SDN_URL, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'ATLAS/1.0 (Geopolitical Dashboard)' },
    });

    if (!res.ok) throw new Error(`OFAC CSV ${res.status}`);

    const entries: SanctionEntry[] = [];
    const byProgram: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    let totalEntries = 0;

    // Stream-parse the CSV to avoid loading full ~25MB into a single string
    const nodeStream = res.body
      ? Readable.fromWeb(res.body as import('node:stream/web').ReadableStream)
      : Readable.from([]);

    const records: string[][] = await new Promise((resolve, reject) => {
      const rows: string[][] = [];
      const parser = nodeStream.pipe(parse({
        relax_column_count: true,
        skip_empty_lines: true,
      }));
      parser.on('data', (row: string[]) => rows.push(row));
      parser.on('end', () => resolve(rows));
      parser.on('error', reject);
    });

    for (const row of records) {
      if (row.length < 12) continue;

      const [id, name, type, programs, , , , , , , , remarks] = row;
      if (!programs) continue;

      const matchedPrograms = matchesTargetProgram(programs);
      if (matchedPrograms.length === 0) continue;

      totalEntries++;

      // Aggregate by program
      for (const prog of matchedPrograms) {
        byProgram[prog] = (byProgram[prog] ?? 0) + 1;
      }

      // Extract country from remarks or programs
      const countryMatch = remarks?.match(/\b(?:Iran|Russia|Syria|North Korea|Cuba|Venezuela|China|Belarus|Yemen|Myanmar|Libya|Sudan|Iraq|Afghanistan)\b/i);
      if (countryMatch) {
        const country = countryMatch[0];
        byCountry[country] = (byCountry[country] ?? 0) + 1;
      }

      // Keep recent/notable entries (limit to last ~100 for sample)
      if (entries.length < 100) {
        entries.push({
          id: `sdn-${id ?? totalEntries}`,
          name: name ?? 'Unknown',
          type: type ?? 'Unknown',
          programs: matchedPrograms,
          country: countryMatch?.[0] ?? 'Unknown',
          remarks: remarks ?? '',
        });
      }
    }

    const response: SanctionsResponse = {
      totalEntries,
      byProgram,
      byCountry,
      recentEntries: entries.slice(0, 50),
      lastUpdated: new Date().toISOString(),
    };

    cache.set('sanctions', response, TTL.SANCTIONS);
    console.log(`[SANCTIONS] ${totalEntries} OFAC entries cached (${Object.keys(byProgram).length} programs)`);
  } catch (err) {
    console.error('[SANCTIONS] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
