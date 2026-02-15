import Redis from 'ioredis';
import { REDIS_URL } from './config.js';

let client: Redis | null = null;
let connected = false;

export function initRedis(): void {
  try {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) return null; // stop retrying
        return Math.min(times * 500, 5000);
      },
      lazyConnect: false,
    });

    client.on('connect', () => {
      connected = true;
      console.log('[REDIS] Connected');
    });

    client.on('error', (err: Error) => {
      connected = false;
      console.warn('[REDIS] Error:', err.message);
    });

    client.on('close', () => {
      connected = false;
    });
  } catch (err) {
    console.warn('[REDIS] Init failed, running without Redis:', err instanceof Error ? err.message : err);
  }
}

export function isRedisConnected(): boolean {
  return connected;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!client || !connected) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!client || !connected) return;
  try {
    const json = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, json);
    } else {
      await client.set(key, json);
    }
  } catch { /* silent */ }
}

export async function redisDel(key: string): Promise<void> {
  if (!client || !connected) return;
  try { await client.del(key); } catch { /* silent */ }
}

export async function redisKeys(pattern: string): Promise<string[]> {
  if (!client || !connected) return [];
  try { return await client.keys(pattern); } catch { return []; }
}
