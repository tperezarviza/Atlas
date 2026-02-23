import { useMemo, useState } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MilitaryFlight } from '../../types';

interface FlightMarkersProps {
  data: MilitaryFlight[] | null;
  visible: boolean;
}

// ── ICAO24 hex ranges → country ──
// Military-specific sub-ranges checked FIRST (more precise), then general country ranges
const ICAO_RANGES: [number, number, string][] = [
  // ── Military-specific (tar1090-db verified) ──
  [0xadf7c8, 0xafffff, 'US'],   // US DoD block
  [0x010070, 0x01008f, 'EG'],   // Egypt military
  [0x0a4000, 0x0a4fff, 'DZ'],   // Algeria military
  [0x33ff00, 0x33ffff, 'IT'],   // Italy military
  [0x350000, 0x37ffff, 'ES'],   // Spain military
  [0x3aa000, 0x3affff, 'FR'],   // France military
  [0x3b7000, 0x3bffff, 'FR'],   // France military (upper)
  [0x3ea000, 0x3ebfff, 'DE'],   // Germany Bundeswehr
  [0x3f4000, 0x3fbfff, 'DE'],   // Germany Bundeswehr (upper)
  [0x400000, 0x40003f, 'UK'],   // UK military (low)
  [0x43c000, 0x43cfff, 'UK'],   // UK military RAF/RN
  [0x444000, 0x446fff, 'AT'],   // Austria military
  [0x44f000, 0x44ffff, 'BE'],   // Belgium military
  [0x457000, 0x457fff, 'BG'],   // Bulgaria military
  [0x45f400, 0x45f4ff, 'DK'],   // Denmark military
  [0x468000, 0x4683ff, 'GR'],   // Greece military
  [0x473c00, 0x473c0f, 'HU'],   // Hungary military
  [0x478100, 0x4781ff, 'NO'],   // Norway military
  [0x480000, 0x480fff, 'NL'],   // Netherlands military
  [0x48d800, 0x48d87f, 'PL'],   // Poland military
  [0x497c00, 0x497cff, 'PT'],   // Portugal military
  [0x498420, 0x49842f, 'CZ'],   // Czech Republic military
  [0x4b7000, 0x4b7fff, 'CH'],   // Switzerland military
  [0x4b8200, 0x4b82ff, 'TR'],   // Turkey military
  [0x738a00, 0x738aff, 'IL'],   // Israel IDF/IAF
  [0x7cf800, 0x7cfaff, 'AU'],   // Australia RAAF
  [0x800200, 0x8002ff, 'IN'],   // India military
  [0xc20000, 0xc3ffff, 'CA'],   // Canada RCAF
  [0xe40000, 0xe41fff, 'BR'],   // Brazil FAB

  // ── General country ranges ──
  [0xa00000, 0xafffff, 'US'],
  [0x100000, 0x1fffff, 'RU'],
  [0x780000, 0x7bffff, 'CN'],
  [0x400000, 0x43ffff, 'UK'],
  [0x3c0000, 0x3fffff, 'DE'],
  [0x380000, 0x3bffff, 'FR'],
  [0x300000, 0x33ffff, 'IT'],
  [0x340000, 0x37ffff, 'ES'],
  [0x440000, 0x447fff, 'AT'],
  [0x448000, 0x44ffff, 'BE'],
  [0x450000, 0x457fff, 'BG'],
  [0x458000, 0x45ffff, 'DK'],
  [0x460000, 0x467fff, 'FI'],
  [0x468000, 0x46ffff, 'GR'],
  [0x470000, 0x477fff, 'HU'],
  [0x478000, 0x47ffff, 'NO'],
  [0x480000, 0x487fff, 'NL'],
  [0x488000, 0x48ffff, 'PL'],
  [0x490000, 0x497fff, 'PT'],
  [0x498000, 0x49ffff, 'CZ'],
  [0x4a0000, 0x4a7fff, 'CH'],
  [0x4b0000, 0x4b7fff, 'SK'],
  [0x4b8000, 0x4bffff, 'TR'],
  [0x4c0000, 0x4c7fff, 'IE'],
  [0x4d0000, 0x4d03ff, 'SE'],
  [0x500000, 0x507fff, 'GR'],
  [0x508000, 0x50ffff, 'TR'],
  [0x510000, 0x5103ff, 'RO'],
  [0x600000, 0x6003ff, 'IL'],
  [0x680000, 0x6803ff, 'KR'],
  [0x681000, 0x6813ff, 'KR'],
  [0x698000, 0x69bfff, 'SA'],
  [0x700000, 0x700fff, 'AF'],
  [0x710000, 0x717fff, 'JP'],
  [0x720000, 0x727fff, 'KR'],
  [0x730000, 0x737fff, 'IR'],
  [0x738000, 0x73ffff, 'IL'],
  [0x740000, 0x747fff, 'JP'],
  [0x748000, 0x74ffff, 'KP'],
  [0x750000, 0x757fff, 'MY'],
  [0x758000, 0x75ffff, 'PH'],
  [0x760000, 0x767fff, 'TH'],
  [0x768000, 0x76ffff, 'SG'],
  [0x770000, 0x777fff, 'ID'],
  [0x780000, 0x7bffff, 'CN'],
  [0x7c0000, 0x7fffff, 'AU'],
  [0x800000, 0x83ffff, 'IN'],
  [0x840000, 0x87ffff, 'JP'],
  [0x880000, 0x887fff, 'EG'],
  [0x890000, 0x897fff, 'ZA'],
  [0x898000, 0x898fff, 'MA'],
  [0x0a0000, 0x0a7fff, 'DZ'],
  [0x0c0000, 0x0c4fff, 'MX'],
  [0x0d0000, 0x0d7fff, 'MX'],
  [0xc00000, 0xc3ffff, 'CA'],
  [0xc80000, 0xcfffff, 'NZ'],
  [0xe00000, 0xe3ffff, 'AR'],
  [0xe40000, 0xe7ffff, 'BR'],
  [0xe80000, 0xebffff, 'CL'],
  [0x200000, 0x27ffff, 'UA'],
  [0x020000, 0x027fff, 'DZ'],
  [0x060000, 0x067fff, 'MZ'],
];

const COUNTRY_COLORS: Record<string, string> = {
  US: '#4a9eff',   // Blue
  RU: '#ff3b3b',   // Red
  CN: '#ff8c00',   // Orange
  UK: '#00ff88',   // Green
  FR: '#a855f7',   // Purple
  DE: '#e8e842',   // Yellow
  UA: '#3baaff',   // Sky blue
  TR: '#e84a4a',   // Red muted
  IL: '#55bbff',   // Light blue
  IN: '#ff6644',   // Orange-red
  JP: '#ff55aa',   // Pink
  AU: '#33ddaa',   // Teal
  CA: '#ff4488',   // Deep pink
  IT: '#44cc44',   // Green
  ES: '#dd6622',   // Burnt orange
  IR: '#cc3333',   // Dark red
  SA: '#22bb88',   // Sea green
  EG: '#cc9933',   // Gold
  KR: '#6699ff',   // Periwinkle
  BR: '#33cc33',   // Lime green
  AR: '#66bbff',   // Light blue
  PK: '#44aa44',   // Forest green
  NO: '#558bff',   // Nordic blue
  PL: '#dd5577',   // Polish red
  SE: '#4488cc',   // Swedish blue
  NL: '#ff7733',   // Dutch orange
  GR: '#4499dd',   // Greek blue
  BE: '#ddaa33',   // Belgian gold
  DK: '#cc4444',   // Danish red
  ZA: '#55bb55',   // SA green
  MX: '#44bb77',   // Mexican green
  DZ: '#339966',   // Algerian green
  NZ: '#228866',   // NZ green
  FI: '#6688cc',   // Finnish blue
  IE: '#33aa55',   // Irish green
  MY: '#cc7722',   // Malaysian amber
  SG: '#dd4455',   // SG red
  ID: '#cc2222',   // Indonesian red
  RO: '#3366bb',   // Romanian blue
  BG: '#668844',   // Bulgarian green
  HU: '#cc5533',   // Hungarian red
  PT: '#339944',   // Portuguese green
  CH: '#cc3322',   // Swiss red
  CZ: '#3355aa',   // Czech blue
  CL: '#3377bb',   // Chilean blue
  PH: '#3355cc',   // Philippine blue
  MA: '#339955',   // Moroccan green
  SK: '#3355aa',   // Slovak blue
  TH: '#3366aa',   // Thai blue
};
const DEFAULT_COLOR = '#c8a020';

// Country names for legend + tooltip
const COUNTRY_NAMES: Record<string, string> = {
  US: 'USA', RU: 'Russia', CN: 'China', UK: 'UK', FR: 'France', DE: 'Germany',
  UA: 'Ukraine', TR: 'Turkey', IL: 'Israel', IN: 'India', JP: 'Japan', AU: 'Australia',
  CA: 'Canada', IT: 'Italy', ES: 'Spain', IR: 'Iran', SA: 'Saudi Arabia', EG: 'Egypt',
  KR: 'S. Korea', BR: 'Brazil', AR: 'Argentina', PK: 'Pakistan', NO: 'Norway',
  PL: 'Poland', SE: 'Sweden', NL: 'Netherlands', GR: 'Greece', BE: 'Belgium',
  DK: 'Denmark', ZA: 'S. Africa', MX: 'Mexico', DZ: 'Algeria', NZ: 'N. Zealand',
  FI: 'Finland', IE: 'Ireland', MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia',
  RO: 'Romania', BG: 'Bulgaria', HU: 'Hungary', PT: 'Portugal', CH: 'Switzerland',
  CZ: 'Czechia', CL: 'Chile', PH: 'Philippines', MA: 'Morocco', SK: 'Slovakia',
  TH: 'Thailand', KP: 'N. Korea', AF: 'Afghanistan', MZ: 'Mozambique',
};

function icaoToCountry(icao24: string): string {
  const hex = parseInt(icao24, 16);
  if (isNaN(hex)) return '';
  for (const [lo, hi, code] of ICAO_RANGES) {
    if (hex >= lo && hex <= hi) return code;
  }
  return '';
}

function bucketHeading(heading: number): number {
  return Math.round(heading / 45) * 45 % 360;
}

const iconCache = new Map<string, L.DivIcon>();
function getFlightIcon(heading: number, countryCode: string): L.DivIcon {
  const bucket = bucketHeading(heading);
  const color = COUNTRY_COLORS[countryCode] ?? DEFAULT_COLOR;
  const key = `${bucket}-${color}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<svg viewBox="0 0 24 24" width="16" height="16" style="transform:rotate(${bucket}deg)"><path d="M12 2L4 14h4v8h8v-8h4z" fill="${color}" opacity="0.9"/></svg>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

// ── Flight Legend ──
function FlightLegend({ counts }: { counts: Record<string, number> }) {
  const [open, setOpen] = useState(false);

  // Sort countries by flight count descending, show top ones
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, open ? 30 : 0);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      position: 'absolute', bottom: 30, left: 10, zIndex: 1000,
      background: 'rgba(10,10,8,0.92)', border: '1px solid rgba(255,200,50,0.15)',
      borderRadius: 6, padding: open ? '8px 10px' : '4px 10px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      maxHeight: 320, overflowY: 'auto', pointerEvents: 'auto',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', color: '#c8a020', fontWeight: 600, fontSize: 11,
                 display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
      >
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path d="M12 2L4 14h4v8h8v-8h4z" fill="#4a9eff" opacity="0.9"/>
        </svg>
        MIL FLIGHTS ({total})
        <span style={{ fontSize: 9, color: '#7a6418' }}>{open ? '▼' : '▶'}</span>
      </div>
      {open && sorted.map(([code, count]) => (
        <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: COUNTRY_COLORS[code] ?? DEFAULT_COLOR, flexShrink: 0,
          }} />
          <span style={{ color: '#999', minWidth: 28 }}>{code}</span>
          <span style={{ color: COUNTRY_COLORS[code] ?? DEFAULT_COLOR, flex: 1 }}>
            {COUNTRY_NAMES[code] ?? code}
          </span>
          <span style={{ color: '#7a6418' }}>{count}</span>
        </div>
      ))}
      {open && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', marginTop: 2,
                       borderTop: '1px solid rgba(255,200,50,0.08)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: DEFAULT_COLOR, flexShrink: 0 }} />
          <span style={{ color: '#999', minWidth: 28 }}>??</span>
          <span style={{ color: DEFAULT_COLOR, flex: 1 }}>Unknown</span>
          <span style={{ color: '#7a6418' }}>{counts[''] ?? 0}</span>
        </div>
      )}
    </div>
  );
}

export default function FlightMarkers({ data, visible }: FlightMarkersProps) {
  const countryCounts = useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    for (const f of data) {
      if (f.on_ground) continue;
      const c = icaoToCountry(f.icao24);
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [data]);

  const markers = useMemo(() => {
    if (!visible || !data) return null;
    return data.filter(f => !f.on_ground).map(f => {
      const country = icaoToCountry(f.icao24);
      return (
        <Marker
          key={f.icao24}
          position={[f.lat, f.lng]}
          icon={getFlightIcon(f.heading, country)}
          zIndexOffset={600}
        >
          <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
            <div className="tt-title">{f.callsign || f.icao24}</div>
            <div className="tt-meta">
              {f.aircraft_type ?? f.category} · {(COUNTRY_NAMES[country] ?? country) || f.origin_country || '?'}
            </div>
            <div className="tt-headline">
              ALT: {Math.round(f.altitude_m)}m · SPD: {Math.round(f.velocity_ms)}m/s · HDG: {Math.round(f.heading)}°
            </div>
          </Tooltip>
        </Marker>
      );
    });
  }, [data, visible]);

  return (
    <>
      {markers}
      {visible && data && data.length > 0 && <FlightLegend counts={countryCounts} />}
    </>
  );
}
