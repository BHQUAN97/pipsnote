import { getRedis } from '@/lib/redis';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import type { RowDataPacket } from 'mysql2';

export interface ProviderConfigRow {
  provider_key: string;
  category: string;
  is_enabled: boolean;
  requires_key: boolean;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
}

interface ProviderConfigDbRow extends RowDataPacket {
  provider_key: string;
  category: string;
  is_enabled: number;
  requires_key: number;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
}

const CACHE_KEY = 'market_data_provider_config:v1';
const CACHE_TTL = 300; // 5 phut — invalidate ngay khi admin save, TTL chi la fallback an toan

export async function getProviderConfigRows(): Promise<Record<string, ProviderConfigRow>> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.error('getProviderConfigRows cache read failed:', err);
    }
  }

  const rows = await query<ProviderConfigDbRow[]>(
    'SELECT provider_key, category, is_enabled, requires_key, api_key_encrypted, api_secret_encrypted FROM market_data_provider_config'
  );
  const map = Object.fromEntries(
    rows.map((r) => [
      r.provider_key,
      {
        provider_key: r.provider_key,
        category: r.category,
        is_enabled: Boolean(r.is_enabled),
        requires_key: Boolean(r.requires_key),
        api_key_encrypted: r.api_key_encrypted,
        api_secret_encrypted: r.api_secret_encrypted,
      },
    ])
  );

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(map), 'EX', CACHE_TTL);
    } catch (err) {
      console.error('getProviderConfigRows cache write failed:', err);
    }
  }

  return map;
}

export async function invalidateProviderConfigCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.error('invalidateProviderConfigCache failed:', err);
  }
}

export async function resolveProviderCredential(
  providerKey: string,
  envFallback: string
): Promise<string | undefined> {
  const config = await getProviderConfigRows();
  const encrypted = config[providerKey]?.api_key_encrypted;
  if (encrypted) {
    try {
      return decrypt(encrypted);
    } catch (err) {
      console.error(`resolveProviderCredential decrypt failed for ${providerKey}:`, err);
    }
  }
  return process.env[envFallback];
}

export async function resolveProviderCredentialPair(
  providerKey: string,
  envKeyFallback: string,
  envSecretFallback: string
): Promise<{ apiKey?: string; apiSecret?: string }> {
  const config = await getProviderConfigRows();
  const row = config[providerKey];

  let apiKey = process.env[envKeyFallback];
  let apiSecret = process.env[envSecretFallback];

  if (row?.api_key_encrypted) {
    try {
      apiKey = decrypt(row.api_key_encrypted);
    } catch (err) {
      console.error(`resolveProviderCredentialPair decrypt (key) failed for ${providerKey}:`, err);
    }
  }
  if (row?.api_secret_encrypted) {
    try {
      apiSecret = decrypt(row.api_secret_encrypted);
    } catch (err) {
      console.error(`resolveProviderCredentialPair decrypt (secret) failed for ${providerKey}:`, err);
    }
  }

  return { apiKey, apiSecret };
}
