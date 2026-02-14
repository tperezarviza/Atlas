import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { geoCentroids } from '../../data/geoCentroids';
import type { InternetIncident } from '../../types';

interface InternetShutdownMarkersProps {
  data: InternetIncident[] | null;
  visible: boolean;
}

let cachedIcon: L.DivIcon | null = null;
function getShutdownIcon(): L.DivIcon {
  if (!cachedIcon) {
    cachedIcon = L.divIcon({
      className: '',
      html: `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z" fill="#ff3b3b" opacity="0.9"/><line x1="4" y1="4" x2="20" y2="20" stroke="#ff3b3b" stroke-width="2.5"/></svg>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return cachedIcon;
}

export default function InternetShutdownMarkers({ data, visible }: InternetShutdownMarkersProps) {
  const markers = useMemo(() => {
    if (!visible || !data) return null;
    const icon = getShutdownIcon();
    return data
      .map(inc => {
        const coords = geoCentroids[inc.countryCode];
        if (!coords) return null;
        return (
          <Marker
            key={inc.id}
            position={coords}
            icon={icon}
            zIndexOffset={550}
          >
            <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
              <div className="tt-title">{inc.country}</div>
              <div className="tt-meta">{inc.eventType.toUpperCase()}</div>
              <div className="tt-headline">
                {inc.title}<br />
                Since: {new Date(inc.startDate).toLocaleDateString()}
              </div>
            </Tooltip>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [data, visible]);

  return <>{markers}</>;
}
