// Permanent conflict zones — events here never fade out
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

/** Age bucket for icon caching (prevents unbounded cache growth) */
export type AgeBucket = 0 | 1 | 2 | 3 | 4 | 5;

export function getAgeBucket(fetchedAt: string | undefined): AgeBucket {
  if (!fetchedAt) return 0;
  const ageH = (Date.now() - new Date(fetchedAt).getTime()) / 3_600_000;
  if (ageH < 1) return 0;
  if (ageH < 6) return 1;
  if (ageH < 24) return 2;
  if (ageH < 48) return 3;
  if (ageH < 72) return 4;
  return 5;
}

export function getEventColor(fetchedAt: string | undefined, lat: number, lng: number): string {
  const ageH = fetchedAt
    ? (Date.now() - new Date(fetchedAt).getTime()) / 3_600_000
    : 0;

  if (isInPermanentZone(lat, lng)) {
    return ageH < 6 ? '#ff4444' : '#cc3333';
  }

  if (ageH < 1) return '#ff4444';
  if (ageH < 6) return '#ff8844';
  if (ageH < 24) return '#ffaa44';
  if (ageH < 48) return '#888855';
  if (ageH < 72) return '#666655';
  return '#444444';
}

export function getEventOpacity(fetchedAt: string | undefined, lat: number, lng: number): number {
  if (isInPermanentZone(lat, lng)) return 0.9;
  if (!fetchedAt) return 1.0;

  const ageH = (Date.now() - new Date(fetchedAt).getTime()) / 3_600_000;
  if (ageH < 6) return 1.0;
  if (ageH < 24) return 0.85;
  if (ageH < 48) return 0.6;
  if (ageH < 72) return 0.4;
  return 0.25;
}
