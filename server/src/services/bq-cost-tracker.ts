import { redisGet, redisSet } from '../redis.js';

let sessionBytes = 0;
const DAILY_BYTE_BUDGET = 100_000_000_000; // 100GB/day = ~$0.625/day max

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

export async function canSpendBQ(estimatedBytes: number): Promise<boolean> {
  const todayKey = `bq:bytes:${new Date().toISOString().slice(0, 10)}`;
  const spent = await redisGet<number>(todayKey) ?? 0;
  if (spent + estimatedBytes > DAILY_BYTE_BUDGET) {
    console.warn(`[BQ] DAILY BUDGET EXCEEDED: ${(spent / 1e9).toFixed(1)}GB spent`);
    return false;
  }
  return true;
}

export async function shouldRunBQ(queryName: string, intervalMs: number): Promise<boolean> {
  const key = `bq:lastrun:${queryName}`;
  const lastRun = await redisGet<number>(key);
  if (lastRun && Date.now() - lastRun < intervalMs) {
    console.log(`[BQ] ${queryName} skipped — ran ${Math.round((Date.now() - lastRun) / 60000)}m ago`);
    return false;
  }
  return true;
}

export async function markBQRun(queryName: string): Promise<void> {
  await redisSet(`bq:lastrun:${queryName}`, Date.now(), 24 * 3600);
}

// Estimated cost at $6.25/TB
export function bytesToCost(bytes: number): number {
  return (bytes / 1e12) * 6.25;
}
