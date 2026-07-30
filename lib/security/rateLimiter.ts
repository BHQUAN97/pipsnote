import { getRedis } from '../redis';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/admin': { windowSeconds: 60, maxRequests: 30 },
  '/api/admin/login': { windowSeconds: 600, maxRequests: 10 },
  default: { windowSeconds: 60, maxRequests: 100 },
};

export async function checkRateLimit(
  ip: string,
  path: string
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const config = RATE_LIMITS[path] || RATE_LIMITS.default;

  // Nếu không có Redis → fail-open (cho qua)
  if (!redis) {
    return { allowed: true, remaining: config.maxRequests };
  }

  const key = `ratelimit:${ip}:${path}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  try {
    // Redis sliding window: zadd + zremrangebyscore + zcard
    await redis.zadd(key, now, `${now}`);
    await redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await redis.zcard(key);
    await redis.expire(key, config.windowSeconds);

    const remaining = Math.max(0, config.maxRequests - count);
    const allowed = count <= config.maxRequests;

    return { allowed, remaining };
  } catch (err) {
    // Redis fail → cho qua (fail-open), log error
    console.error('Rate limit check failed:', err);
    return { allowed: true, remaining: config.maxRequests };
  }
}
