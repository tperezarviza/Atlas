import { redisGet, redisSet } from '../redis.js';

let sessionBytes = 0;

export function trackQueryBytes(bytes: number): void {
  sessionBytes += bytes;
}

export function getSessionBytes(): number {
  return sessionBytes;
}

export async function getDailyBytes(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const stored = await redisGet<number>(`bq:bytes:${today}`) ?? 0;
  return stored + sessionBytes;
}

export async function flushDailyBytes(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await redisGet<number>(`bq:bytes:${today}`) ?? 0;
  await redisSet(`bq:bytes:${today}`, current + sessionBytes, 48 * 3600);
  sessionBytes = 0;
}

// Estimated cost at $6.25/TB
export function bytesToCost(bytes: number): number {
  return (bytes / 1e12) * 6.25;
}
