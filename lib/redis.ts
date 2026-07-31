import { Redis } from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  // Skip Redis nếu không có config (cho phép dev opt-in bằng cách set REDIS_HOST)
  if (!process.env.REDIS_HOST) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });
  }

  return redisInstance;
}
