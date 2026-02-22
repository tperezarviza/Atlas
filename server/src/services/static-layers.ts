import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { cache } from '../cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const LAYER_TTL = 7 * 24 * 60 * 60 * 1000; // 24h — static data barely changes

interface GeoJSONCollection {
  type: string;
  features: Array<{
    type: string;
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }>;
}

function loadJSON(filename: string): GeoJSONCollection | null {
  try {
    const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(raw) as GeoJSONCollection;
  } catch (err) {
    console.error(`[STATIC-LAYERS] Failed to load ${filename}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export function loadStaticLayers(): void {
  console.log('[STATIC-LAYERS] Loading GeoJSON data...');
  let loaded = 0;

  const bases = loadJSON('military-bases.json');
  if (bases) { cache.set('layer_bases', bases, LAYER_TTL); loaded++; }

  const cables = loadJSON('undersea-cables.json');
  if (cables) { cache.set('layer_cables', cables, LAYER_TTL); loaded++; }

  const pipelines = loadJSON('pipelines.json');
  if (pipelines) { cache.set('layer_pipelines', pipelines, LAYER_TTL); loaded++; }

  console.log(`[STATIC-LAYERS] Loaded ${loaded}/3 layers (bases: ${bases?.features.length ?? 0}, cables: ${cables?.features.length ?? 0}, pipelines: ${pipelines?.features.length ?? 0})`);
}
