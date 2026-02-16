import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

const COUNTRY_LABELS: { name: string; lat: number; lng: number }[] = [
  { name: 'USA', lat: 39.8, lng: -98.5 },
  { name: 'MEXICO', lat: 23.6, lng: -102.5 },
  { name: 'BRAZIL', lat: -14.2, lng: -51.9 },
  { name: 'UK', lat: 55.4, lng: -3.4 },
  { name: 'FRANCE', lat: 46.2, lng: 2.2 },
  { name: 'GERMANY', lat: 51.2, lng: 10.4 },
  { name: 'RUSSIA', lat: 61.5, lng: 105.3 },
  { name: 'UKRAINE', lat: 48.4, lng: 31.2 },
  { name: 'TURKEY', lat: 38.9, lng: 35.2 },
  { name: 'IRAN', lat: 32.4, lng: 53.7 },
  { name: 'IRAQ', lat: 33.2, lng: 43.7 },
  { name: 'SYRIA', lat: 34.8, lng: 38.9 },
  { name: 'ISRAEL', lat: 31.0, lng: 34.8 },
  { name: 'S. ARABIA', lat: 23.9, lng: 45.1 },
  { name: 'EGYPT', lat: 26.8, lng: 30.8 },
  { name: 'INDIA', lat: 20.6, lng: 79.0 },
  { name: 'CHINA', lat: 35.9, lng: 104.2 },
  { name: 'JAPAN', lat: 36.2, lng: 138.3 },
  { name: 'S. KOREA', lat: 35.9, lng: 127.8 },
  { name: 'N. KOREA', lat: 40.3, lng: 127.5 },
  { name: 'TAIWAN', lat: 23.7, lng: 121.0 },
  { name: 'PAKISTAN', lat: 30.4, lng: 69.3 },
];

export default function CountryLabels() {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    COUNTRY_LABELS.forEach(({ name, lat, lng }) => {
      const icon = L.divIcon({
        className: 'country-label-marker',
        html: name,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([lat, lng], { icon, interactive: false });
      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach(m => m.remove());
    };
  }, [map]);

  return null;
}
