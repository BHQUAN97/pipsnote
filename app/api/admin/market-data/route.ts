import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { MarketDataSymbol } from '@/lib/types';

async function getHandler(_req: NextRequest) {
  await requireAdmin(['superadmin']);

  // LEFT JOIN — admin can thay ca symbol chua co snapshot lan nao de debug provider chet,
  // khac voi getMarketDataSnapshot() (public) dung JOIN thuong de an symbol chua co gia.
  const items = await query<MarketDataSymbol[]>(
    `SELECT s.id, s.label, s.category, s.decimals, s.is_active, s.sort_order, s.updated_at,
            sn.price, sn.change_percent, sn.direction, sn.source, sn.fetched_at
     FROM market_data_symbols s
     LEFT JOIN market_data_snapshots sn ON sn.symbol_id = s.id
     ORDER BY s.sort_order DESC, s.updated_at DESC, s.id DESC`
  );

  return NextResponse.json({ items });
}

export const GET = withApiHandler('admin-market-data-list', getHandler);
