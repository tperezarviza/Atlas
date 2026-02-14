import { ALIENVAULT_API_KEY, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { CyberThreatPulse, ShodanIntelligence, CyberIntelligence, CyberSeverity } from '../types.js';

// ── AlienVault OTX ──

const OTX_BASE = 'https://otx.alienvault.com/api/v1';

const STATE_APT_GROUPS: Record<string, string> = {
  'APT28': 'Russia', 'APT29': 'Russia', 'Sandworm': 'Russia', 'Turla': 'Russia',
  'APT1': 'China', 'APT10': 'China', 'APT41': 'China', 'Volt Typhoon': 'China',
  'APT33': 'Iran', 'APT35': 'Iran', 'MuddyWater': 'Iran',
  'Lazarus': 'North Korea', 'APT38': 'North Korea', 'Kimsuky': 'North Korea',
};

function classifySeverity(pulse: any): CyberSeverity {
  const tags = (pulse.tags || []).map((t: string) => t.toLowerCase());
  const adversary = (pulse.adversary || '').toLowerCase();
  if (tags.some((t: string) => /apt|nation.state|zero.day|critical/.test(t))) return 'critical';
  if (adversary && Object.keys(STATE_APT_GROUPS).some(g => adversary.includes(g.toLowerCase()))) return 'critical';
  if (tags.some((t: string) => /ransomware|exploit|backdoor|rootkit/.test(t))) return 'high';
  if (tags.some((t: string) => /phishing|malware|trojan|c2/.test(t))) return 'medium';
  return 'low';
}

export async function fetchCyberThreats(): Promise<void> {
  if (cache.isFresh('cyber_threats')) return;

  if (!ALIENVAULT_API_KEY) {
    console.warn('[CYBER] No OTX API key configured, skipping threats');
    return;
  }

  console.log('[CYBER] Fetching OTX threat pulses...');
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const url = `${OTX_BASE}/pulses/subscribed?modified_since=${since}&limit=50`;
    const res = await fetch(url, {
      headers: { 'X-OTX-API-KEY': ALIENVAULT_API_KEY },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) throw new Error(`OTX API ${res.status}`);

    const data = await res.json() as { results?: any[] };
    const pulses: CyberThreatPulse[] = (data.results || []).map((p: any) => ({
      id: p.id || '',
      name: p.name || '',
      description: (p.description || '').slice(0, 500),
      adversary: p.adversary || undefined,
      targeted_countries: p.targeted_countries || [],
      tags: (p.tags || []).slice(0, 10),
      malware_families: (p.malware_families || []).slice(0, 5),
      indicators_count: p.indicators?.length || 0,
      tlp: p.tlp || 'white',
      created: p.created || '',
      modified: p.modified || '',
      severity: classifySeverity(p),
    }));

    // Sort by severity then date
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    pulses.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

    cache.set('cyber_threats', pulses, TTL.CYBER_THREATS);
    console.log(`[CYBER] Cached ${pulses.length} threat pulses (${pulses.filter(p => p.severity === 'critical').length} critical)`);
  } catch (err) {
    console.error('[CYBER] OTX fetch failed:', err instanceof Error ? err.message : err);
  }
}

// Shodan removed — no API key needed

export async function fetchCyberInfra(): Promise<void> {
  // No-op: Shodan removed
}

// ── Combined endpoint builder ──

export function buildCyberIntelligence(): CyberIntelligence {
  const threats = cache.get<CyberThreatPulse[]>('cyber_threats') || [];
  const infra = cache.get<ShodanIntelligence[]>('cyber_infra') || [];

  const countryFreq = new Map<string, number>();
  const adversaryFreq = new Map<string, number>();
  for (const t of threats) {
    for (const c of t.targeted_countries) countryFreq.set(c, (countryFreq.get(c) || 0) + 1);
    if (t.adversary) adversaryFreq.set(t.adversary, (adversaryFreq.get(t.adversary) || 0) + 1);
  }

  return {
    active_threats: threats,
    infrastructure_exposure: infra,
    summary: {
      total_active_threats: threats.length,
      critical_threats: threats.filter(t => t.severity === 'critical').length,
      most_targeted_countries: [...countryFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
      most_active_adversaries: [...adversaryFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
    },
  };
}
