import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { MilitaryFlight } from '../../types';

interface FlightMarkersProps {
  data: MilitaryFlight[] | null;
  visible: boolean;
}

const COUNTRY_COLORS: Record<string, string> = {
  'United States': '#4a9eff',
  'Russia': '#ff3b3b',
  'China': '#ff8c00',
};
const DEFAULT_COLOR = '#c8a020';

function bucketHeading(heading: number): number {
  return Math.round(heading / 45) * 45 % 360;
}

const iconCache = new Map<string, L.DivIcon>();
function getFlightIcon(heading: number, country: string): L.DivIcon {
  const bucket = bucketHeading(heading);
  const color = COUNTRY_COLORS[country] ?? DEFAULT_COLOR;
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
    return data.filter(f => !f.on_ground).map(f => (
      <Marker
        key={f.icao24}
        position={[f.lat, f.lng]}
        icon={getFlightIcon(f.heading, f.origin_country)}
        zIndexOffset={600}
      >
        <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
          <div className="tt-title">{f.callsign || f.icao24}</div>
          <div className="tt-meta">
            {f.aircraft_type ?? f.category} · {f.origin_country}
          </div>
          <div className="tt-headline">
            ALT: {Math.round(f.altitude_m)}m · SPD: {Math.round(f.velocity_ms)}m/s · HDG: {Math.round(f.heading)}°
          </div>
        </Tooltip>
      </Marker>
    ));
  }, [data, visible]);

  return <>{markers}</>;
}
