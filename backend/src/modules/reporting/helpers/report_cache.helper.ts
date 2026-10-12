import { Redis } from 'ioredis';
import { env } from '../../../shared/config/env.js';

const CACHE_TTL_SECONDS = 60;

let client: Redis | null | undefined;
let redisDisabled = false;

function getRedis(): Redis | null {
  if (redisDisabled) return null;
  if (client !== undefined) return client;
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1_000,
      retryStrategy: () => null,
    });
    client.on('error', () => {
      // miss de cache; não derruba o request
    });
    return client;
  } catch {
    client = null;
    redisDisabled = true;
    return null;
  }
}

async function ensureConnected(redis: Redis): Promise<boolean> {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    await redis.ping();
    // não impedir o process exit (smoke / short-lived)
    redis.stream?.unref?.();
    return true;
  } catch {
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
    client = null;
    redisDisabled = true;
    return false;
  }
}

/** Cache curto ≤60s. Redis down → calcula sem cache (não 503). */
export async function withReportCache<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  if (redis) {
    const ok = await ensureConnected(redis);
    if (ok) {
      try {
        const hit = await redis.get(key);
        if (hit) return JSON.parse(hit) as T;
      } catch {
        // fall through
      }
    }
  }

  const value = await compute();

  if (redis && !redisDisabled) {
    try {
      const ok = await ensureConnected(redis);
      if (ok) {
        await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
      }
    } catch {
      // ignore
    }
  }

  return value;
}

/** Encerra conexão de cache (smokes / shutdown). */
export async function closeReportCache(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    try {
      client.disconnect();
    } catch {
      // ignore
    }
  }
  client = null;
}
