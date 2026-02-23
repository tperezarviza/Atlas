import { redisGet, redisSet } from './redis.js';

interface CacheEntry<T> {
  data: T;
  setAt: number;
  ttlMs: number;
}

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_MULTIPLIER = 3; // remove entries older than 3x TTL (aligned with getWithStatus)

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, setAt: Date.now(), ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    // Return data even if stale — stale data is better than nothing
    return entry.data as T;
  }

  async setWithRedis<T>(key: string, value: T, memoryTTL: number, redisTTLSeconds?: number): Promise<void> {
    this.set(key, value, memoryTTL);
    const ttl = redisTTLSeconds ?? Math.ceil(memoryTTL * 3 / 1000);
    try {
      await redisSet(`cache:${key}`, value, ttl);
    } catch (err) {
      console.warn(`[CACHE] Redis backup failed for ${key}:`, err instanceof Error ? err.message : err);
    }
  }

  async getWithRedis<T>(key: string): Promise<T | undefined> {
    const mem = this.get<T>(key);
    if (mem !== null) return mem;
    try {
      const redis = await redisGet<T>(`cache:${key}`);
      if (redis !== null && redis !== undefined) {
        console.log(`[CACHE] Restored ${key} from Redis backup`);
        this.set(key, redis, 900_000); // 15 min bridge (warmup takes ~11 min)
        return redis;
      }
    } catch { /* Redis unavailable, continue without */ }
    return undefined;
  }

  isFresh(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    return Date.now() - entry.setAt < entry.ttlMs;
  }

  age(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return Date.now() - entry.setAt;
  }

  keys(): string[] {
    return [...this.store.keys()];
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  getWithStatus<T>(key: string): { data: T | null; status: 'fresh' | 'stale' | 'very_stale' | 'no_data'; ageMs: number | null } {
    const entry = this.store.get(key);
    if (!entry) return { data: null, status: 'no_data', ageMs: null };
    const age = Date.now() - entry.setAt;
    if (age < entry.ttlMs) return { data: entry.data as T, status: 'fresh', ageMs: age };
    if (age < entry.ttlMs * 3) return { data: entry.data as T, status: 'stale', ageMs: age };
    return { data: entry.data as T, status: 'very_stale', ageMs: age };
  }

  getSetAt(key: string): number | null {
    const entry = this.store.get(key);
    return entry ? entry.setAt : null;
  }

  /** Remove entries that are far past their TTL to prevent memory leaks */
  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      const age = now - entry.setAt;
      if (age > entry.ttlMs * STALE_MULTIPLIER) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[CACHE] Cleanup: removed ${removed} stale entries, ${this.store.size} remaining`);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.sweep(), CLEANUP_INTERVAL);
    // Don't prevent Node from exiting
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }
}

export const cache = new TTLCache();
