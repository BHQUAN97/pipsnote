import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { encrypt } from '@/lib/crypto';
import { invalidateProviderConfigCache } from '@/lib/marketData/providerConfig';
import type { RowDataPacket } from 'mysql2';
import type { MarketDataProviderConfig } from '@/lib/types';

const VALID_PROVIDER_KEYS = ['twelvedata', 'fcs', 'alpaca', 'coingecko', 'goldapi'] as const;

const ProviderConfigUpdateSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    apiKey: z.string().min(1).nullable().optional(),
    apiSecret: z.string().min(1).nullable().optional(),
  })
  .strict();

interface ProviderConfigDbRow extends RowDataPacket {
  provider_key: string;
  category: string;
  is_enabled: number;
  requires_key: number;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  updated_at: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function extractKey(req: NextRequest): string {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/market-data\/providers\/([a-z]+)/);
  const key = match?.[1];
  if (!key || !VALID_PROVIDER_KEYS.includes(key as (typeof VALID_PROVIDER_KEYS)[number])) {
    throw new HttpError(404, 'Unknown market data provider');
  }
  return key;
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const key = extractKey(req);

  const existing = await query<ProviderConfigDbRow[]>(
    'SELECT provider_key, category, is_enabled, requires_key, api_key_encrypted, api_secret_encrypted, updated_at FROM market_data_provider_config WHERE provider_key = ? LIMIT 1',
    [key]
  );
  const row = existing[0];
  if (!row) {
    throw new HttpError(404, 'Market data provider config not found');
  }

  const body = await req.json();
  const parsed = ProviderConfigUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid provider config update', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { is_enabled, apiKey, apiSecret } = parsed.data;

  if (apiKey !== undefined || apiSecret !== undefined) {
    if (!process.env.ENCRYPTION_KEY) {
      throw new HttpError(500, 'ENCRYPTION_KEY chưa được cấu hình trên server');
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (is_enabled !== undefined) {
    sets.push('is_enabled = ?');
    params.push(is_enabled);
  }
  if (apiKey !== undefined) {
    sets.push('api_key_encrypted = ?');
    params.push(apiKey === null ? null : encrypt(apiKey));
  }
  if (apiSecret !== undefined) {
    sets.push('api_secret_encrypted = ?');
    params.push(apiSecret === null ? null : encrypt(apiSecret));
  }

  if (sets.length > 0) {
    sets.push('updated_by = ?');
    params.push(user.username);
    params.push(key);
    await query(`UPDATE market_data_provider_config SET ${sets.join(', ')} WHERE provider_key = ?`, params);
  }

  await invalidateProviderConfigCache();

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'update_market_data_provider_config',
      'market_data_provider_config',
      key,
      JSON.stringify({
        is_enabled,
        apiKeyChanged: apiKey !== undefined,
        apiSecretChanged: apiSecret !== undefined,
      }),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  const updated = await query<ProviderConfigDbRow[]>(
    'SELECT provider_key, category, is_enabled, requires_key, api_key_encrypted, api_secret_encrypted, updated_at FROM market_data_provider_config WHERE provider_key = ? LIMIT 1',
    [key]
  );
  const result = updated[0];
  const item: MarketDataProviderConfig = {
    provider_key: result.provider_key,
    category: result.category as MarketDataProviderConfig['category'],
    is_enabled: Boolean(result.is_enabled),
    requires_key: Boolean(result.requires_key),
    has_api_key: Boolean(result.api_key_encrypted),
    has_api_secret: Boolean(result.api_secret_encrypted),
    updated_at: result.updated_at,
  };

  return NextResponse.json({ item });
}

export const PATCH = withApiHandler('admin-market-data-providers-patch', patchHandler);
