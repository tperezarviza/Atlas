// Permanent conflict zones — events here are never pruned
const PERMANENT_ZONES = [
  { name: 'Gaza/Israel', bbox: [34.0, 31.0, 35.0, 32.0] },
  { name: 'Ukraine Front', bbox: [30.0, 46.0, 40.0, 52.0] },
  { name: 'Haiti', bbox: [-74.5, 18.0, -71.5, 20.0] },
  { name: 'Sudan', bbox: [21.0, 8.0, 39.0, 23.0] },
  { name: 'Myanmar', bbox: [92.0, 9.0, 102.0, 28.5] },
  { name: 'Somalia', bbox: [40.0, -2.0, 52.0, 12.0] },
  { name: 'Yemen', bbox: [42.0, 12.0, 54.5, 19.0] },
  { name: 'Syria', bbox: [35.5, 32.0, 42.5, 37.5] },
  { name: 'DR Congo East', bbox: [25.0, -5.0, 31.0, 3.0] },
] as const;

export function isInPermanentZone(lat: number, lng: number): boolean {
  return PERMANENT_ZONES.some(z =>
    lng >= z.bbox[0] && lat >= z.bbox[1] && lng <= z.bbox[2] && lat <= z.bbox[3]
  );
}
