export function formatTime(date: Date, timeZone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function toneToColor(tone: number): string {
  if (tone < -5) return '#e83b3b';
  if (tone < -2) return '#e8842b';
  if (tone > 2) return '#28b35a';
  return '#d4a72c';
}

export function toneToClass(tone: number): string {
  if (tone < -5) return 'neg-high';
  if (tone < -2) return 'neg-mid';
  if (tone > 2) return 'positive';
  return 'neutral';
}

export function newsMarkerSize(tone: number): number {
  if (tone < -5) return 7;
  if (tone < -2) return 5;
  return 4;
}

export function conflictMarkerSize(severity: string): number {
  const sizes: Record<string, number> = {
    critical: 14,
    high: 11,
    medium: 8,
    low: 6,
  };
  return sizes[severity] || 6;
}
