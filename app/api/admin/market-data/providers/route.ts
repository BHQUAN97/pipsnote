import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { MarketDataProviderConfig } from '@/lib/types';

interface ProviderConfigDbRow extends RowDataPacket {
  provider_key: string;
  category: string;
  is_enabled: number;
  requires_key: number;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  updated_at: string;
}

async function getHandler() {
  await requireAdmin(['superadmin']);

  const rows = await query<ProviderConfigDbRow[]>(
    'SELECT provider_key, category, is_enabled, requires_key, api_key_encrypted, api_secret_encrypted, updated_at FROM market_data_provider_config ORDER BY category, provider_key'
  );

  const items: MarketDataProviderConfig[] = rows.map((r) => ({
    provider_key: r.provider_key,
    category: r.category as MarketDataProviderConfig['category'],
    is_enabled: Boolean(r.is_enabled),
    requires_key: Boolean(r.requires_key),
    has_api_key: Boolean(r.api_key_encrypted),
    has_api_secret: Boolean(r.api_secret_encrypted),
    updated_at: r.updated_at,
  }));

  return NextResponse.json({ items });
}

export const GET = withApiHandler('admin-market-data-providers-get', getHandler);
