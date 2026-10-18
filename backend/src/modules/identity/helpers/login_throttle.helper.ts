import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from '../../../shared/config/env.js';

/**
 * Controle de tentativas de login por **e-mail + IP**.
 * Quem erra a senha só tranca a si mesmo: um terceiro (outro IP) não consegue
 * bloquear o dono da conta. Redis quando disponível; memória como reserva.
 */
const FAILURES_BEFORE_LOCK = 5;
const BASE_LOCK_SECONDS = 10 * 60;
const MAX_LOCK_SECONDS = 60 * 60;
const COUNTER_TTL_SECONDS = 24 * 60 * 60;

type MemoryEntry = { count: number; countExpiresAt: number; lockedUntil: number };
const memory = new Map<string, MemoryEntry>();

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client !== undefined) return client;
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1_000,
      retryStrategy: () => null,
    });
    client.on('error', () => undefined);
    return client;
  } catch {
    client = null;
    return null;
  }
}

async function redisReady(): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    if (redis.status === 'wait') await redis.connect();
    if (redis.status !== 'ready') return null;
    redis.stream?.unref?.();
    return redis;
  } catch {
    return null;
  }
}

function keyFor(email: string, ip: string): string {
  const digest = createHash('sha256').update(`${email.toLowerCase()}|${ip}`).digest('hex').slice(0, 32);
  return `login:throttle:${digest}`;
}

export function lockSecondsForFailures(failures: number): number {
  if (failures < FAILURES_BEFORE_LOCK) return 0;
  const steps = Math.floor((failures - FAILURES_BEFORE_LOCK) / FAILURES_BEFORE_LOCK);
  return Math.min(BASE_LOCK_SECONDS * 2 ** steps, MAX_LOCK_SECONDS);
}

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const key = keyFor(email, ip);
  const redis = await redisReady();
  if (redis) {
    try {
      return (await redis.exists(`${key}:lock`)) === 1;
    } catch {
      /* cai para memória */
    }
  }
  const entry = memory.get(key);
  return Boolean(entry && entry.lockedUntil > Date.now());
}

export async function registerLoginFailure(email: string, ip: string): Promise<void> {
  const key = keyFor(email, ip);
  const redis = await redisReady();
  if (redis) {
    try {
      const failures = await redis.incr(`${key}:count`);
      await redis.expire(`${key}:count`, COUNTER_TTL_SECONDS);
      const lockSeconds =
        failures % FAILURES_BEFORE_LOCK === 0 ? lockSecondsForFailures(failures) : 0;
      if (lockSeconds > 0) await redis.set(`${key}:lock`, '1', 'EX', lockSeconds);
      return;
    } catch {
      /* cai para memória */
    }
  }
  const now = Date.now();
  const current = memory.get(key);
  const count = current && current.countExpiresAt > now ? current.count + 1 : 1;
  const lockSeconds = count % FAILURES_BEFORE_LOCK === 0 ? lockSecondsForFailures(count) : 0;
  memory.set(key, {
    count,
    countExpiresAt: now + COUNTER_TTL_SECONDS * 1000,
    lockedUntil: lockSeconds > 0 ? now + lockSeconds * 1000 : (current?.lockedUntil ?? 0),
  });
}

export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  const key = keyFor(email, ip);
  memory.delete(key);
  const redis = await redisReady();
  if (!redis) return;
  try {
    await redis.del(`${key}:count`, `${key}:lock`);
  } catch {
    /* sem efeito */
  }
}
