import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.REDIS_URI || '';
let redis: Redis | null = null;
let redisAvailable = false;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redisAvailable = true;
  } catch (e) {
    // will fallback to file cache
    redis = null;
    redisAvailable = false;
    // eslint-disable-next-line no-console
    console.warn('Redis init failed, falling back to file cache', e);
  }
}

export function isRedisAvailable() {
  return redisAvailable && redis != null;
}

export async function redisGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number) {
  if (!redis) return;
  try {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  } catch (e) {
    // ignore
  }
}

export async function redisIncrWithExpire(key: string, windowSeconds: number): Promise<number> {
  if (!redis) return -1;
  try {
    const v = await redis.incr(key);
    if (v === 1) {
      await redis.expire(key, windowSeconds);
    }
    return Number(v);
  } catch (e) {
    return -1;
  }
}

export async function redisSetResourceKey(key: string) {
  if (!redis) return false;
  try {
    await redis.set('pusiknas:resource_key', key);
    return true;
  } catch (e) {
    return false;
  }
}

export async function redisGetResourceKey(): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get('pusiknas:resource_key');
  } catch (e) {
    return null;
  }
}
