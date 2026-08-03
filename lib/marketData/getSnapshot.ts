import { getRedis } from '@/lib/redis';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export interface MarketDataSnapshotItem {
  label: string;
  decimals: number;
  price: number;
  direction: 'up' | 'down' | 'flat';
}

const CACHE_KEY = 'market_data:snapshot:v1';
const CACHE_TTL = 1200; // 20 phut — lon hon chu ky cron 15 phut de 1 lan cron tre khong lam mat cache

interface SnapshotRow extends RowDataPacket {
  label: string;
  decimals: number;
  price: string;
  direction: 'up' | 'down' | 'flat';
}

export async function getMarketDataSnapshot(): Promise<MarketDataSnapshotItem[]> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.error('getMarketDataSnapshot cache read failed:', err);
    }
  }

  const rows = await query<SnapshotRow[]>(
    `SELECT s.label, s.decimals, sn.price, sn.direction
     FROM market_data_symbols s
     JOIN market_data_snapshots sn ON sn.symbol_id = s.id
     WHERE s.is_active = 1
     ORDER BY s.sort_order DESC, s.updated_at DESC, s.id DESC`
  );

  const items: MarketDataSnapshotItem[] = rows.map((row) => ({
    label: row.label,
    decimals: row.decimals,
    price: Number(row.price),
    direction: row.direction,
  }));

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(items), 'EX', CACHE_TTL);
    } catch (err) {
      console.error('getMarketDataSnapshot cache write failed:', err);
    }
  }

  return items;
}

export async function invalidateMarketDataSnapshotCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.error('invalidateMarketDataSnapshotCache failed:', err);
  }
}
