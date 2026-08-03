import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { invalidateMarketDataSnapshotCache } from '@/lib/marketData/getSnapshot';
import type { MarketDataSymbol } from '@/lib/types';

const MarketDataUpdateSchema = z.object({ is_active: z.boolean() }).strict();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function extractId(req: NextRequest): number {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/market-data\/(\d+)/);
  if (!match) {
    throw new HttpError(400, 'Invalid market data symbol id');
  }
  return Number(match[1]);
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const id = extractId(req);

  const existing = await query<MarketDataSymbol[]>(
    'SELECT id FROM market_data_symbols WHERE id = ? LIMIT 1',
    [id]
  );
  if (!existing[0]) {
    throw new HttpError(404, 'Market data symbol not found');
  }

  const body = await req.json();
  const parsed = MarketDataUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid market data update', details: parsed.error.issues },
      { status: 400 }
    );
  }

  await query('UPDATE market_data_symbols SET is_active = ? WHERE id = ?', [
    parsed.data.is_active,
    id,
  ]);

  await invalidateMarketDataSnapshotCache();

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'update_market_data_symbol',
      'market_data_symbol',
      String(id),
      JSON.stringify(parsed.data),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

export const PATCH = withApiHandler('admin-market-data-patch', patchHandler);
