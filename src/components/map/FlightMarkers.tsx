import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { MilitaryFlight } from '../../types';

interface FlightMarkersProps {
  data: MilitaryFlight[] | null;
  visible: boolean;
}

// ICAO24 hex ranges → country (major military nations)
const ICAO_RANGES: [number, number, string][] = [
  [0xa00000, 0xafffff, 'US'],
  [0x100000, 0x1fffff, 'RU'],
  [0x780000, 0x7bffff, 'CN'],
  [0x400000, 0x43ffff, 'UK'],
  [0x3c0000, 0x3fffff, 'DE'],
  [0x380000, 0x3bffff, 'FR'],
  [0x300000, 0x33ffff, 'IT'],
  [0x340000, 0x37ffff, 'ES'],
  [0x440000, 0x447fff, 'AT'],
  [0x484000, 0x487fff, 'DK'],
  [0x460000, 0x467fff, 'BE'],
  [0x480000, 0x483fff, 'NL'],
  [0x4a0000, 0x4a3fff, 'CH'],
  [0x4b0000, 0x4b7fff, 'CZ'],
  [0x500000, 0x503fff, 'GR'],
  [0x740000, 0x747fff, 'JP'],
  [0x710000, 0x717fff, 'AU'],
  [0x700000, 0x70ffff, 'IN'],
  [0x680000, 0x6803ff, 'KR'],
  [0x7c0000, 0x7fffff, 'AU'],
  [0xc00000, 0xc3ffff, 'CA'],
  [0xe00000, 0xe3ffff, 'AR'],
  [0xe40000, 0xe7ffff, 'BR'],
  [0x200000, 0x27ffff, 'UA'],
  [0x508000, 0x50bfff, 'TR'],
  [0x738000, 0x73ffff, 'PK'],
  [0x748000, 0x74ffff, 'KP'],
  [0x760000, 0x767fff, 'TH'],
  [0x730000, 0x737fff, 'IR'],
  [0x698000, 0x69bfff, 'SA'],
  [0x880000, 0x887fff, 'EG'],
  [0x600000, 0x6003ff, 'IL'],
];

const COUNTRY_COLORS: Record<string, string> = {
  US: '#4a9eff',
  RU: '#ff3b3b',
  CN: '#ff8c00',
  UK: '#00ff88',
  FR: '#a855f7',
  DE: '#e8e842',
  UA: '#3baaff',
  TR: '#e84a4a',
  IL: '#55bbff',
  IN: '#ff6644',
  JP: '#ff55aa',
  AU: '#33ddaa',
  CA: '#ff4488',
  IT: '#44cc44',
  ES: '#dd6622',
  IR: '#cc3333',
  SA: '#22bb88',
  EG: '#cc9933',
  KR: '#6699ff',
  BR: '#33cc33',
  AR: '#66bbff',
  PK: '#44aa44',
};
const DEFAULT_COLOR = '#c8a020';

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

export default function FlightMarkers({ data, visible }: FlightMarkersProps) {
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
              {f.aircraft_type ?? f.category} · {country || f.origin_country || '?'}
            </div>
            <div className="tt-headline">
              ALT: {Math.round(f.altitude_m)}m · SPD: {Math.round(f.velocity_ms)}m/s · HDG: {Math.round(f.heading)}°
            </div>
          </Tooltip>
        </Marker>
      );
    });
  }, [data, visible]);

  return <>{markers}</>;
}
