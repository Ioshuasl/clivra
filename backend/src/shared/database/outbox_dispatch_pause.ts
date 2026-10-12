import { Redis } from 'ioredis';
import { env } from '../config/env.js';

/** Coordena smoke/test com o worker real: enquanto a chave existir, o tick não despacha. */
export const OUTBOX_DISPATCH_PAUSE_KEY = 'odonto:outbox:dispatch:paused';

let workerProbe: Redis | null = null;

function createRedis(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 2_000,
    retryStrategy: () => null,
  });
}

async function connect(redis: Redis): Promise<void> {
  await redis.connect();
  await redis.ping();
}

async function dropWorkerProbe(): Promise<void> {
  if (!workerProbe) return;
  try {
    workerProbe.disconnect();
  } catch {
    // ignore
  }
  workerProbe = null;
}

async function getWorkerProbe(): Promise<Redis | null> {
  if (workerProbe?.status === 'ready') {
    try {
      await workerProbe.ping();
      return workerProbe;
    } catch {
      await dropWorkerProbe();
    }
  } else {
    await dropWorkerProbe();
  }

  try {
    const redis = createRedis();
    await connect(redis);
    workerProbe = redis;
    return workerProbe;
  } catch {
    await dropWorkerProbe();
    return null;
  }
}

export async function isOutboxDispatchPaused(): Promise<boolean> {
  const redis = await getWorkerProbe();
  if (!redis) return false;
  try {
    return (await redis.get(OUTBOX_DISPATCH_PAUSE_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Pausa o dispatcher do worker. Retorna resume (sempre chamar em finally; encerra a conexão). */
export async function pauseOutboxDispatch(ttlSeconds = 180): Promise<() => Promise<void>> {
  const redis = createRedis();
  await connect(redis);
  await redis.set(OUTBOX_DISPATCH_PAUSE_KEY, '1', 'EX', ttlSeconds);
  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    try {
      await redis.del(OUTBOX_DISPATCH_PAUSE_KEY);
    } catch {
      // best-effort
    }
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
  };
}
