import { getRedis } from './redis';
import { query } from './db';
import type { RowDataPacket } from 'mysql2';

export type SiteSettings = Record<string, string>;

const CACHE_KEY = 'site_settings:v1';
const CACHE_TTL = 300; // 5 phút — invalidate ngay khi admin save, TTL chỉ là fallback an toàn

interface SettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.error('getSiteSettings cache read failed:', err);
    }
  }

  const rows = await query<SettingRow[]>(
    'SELECT setting_key, setting_value FROM site_settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(map), 'EX', CACHE_TTL);
    } catch (err) {
      console.error('getSiteSettings cache write failed:', err);
    }
  }

  return map;
}

export async function invalidateSiteSettingsCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.error('invalidateSiteSettingsCache failed:', err);
  }
}
