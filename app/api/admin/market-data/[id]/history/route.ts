import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import type { RowDataPacket } from 'mysql2';

interface HistoryRow extends RowDataPacket {
  price: string;
  fetched_at: Date;
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin']);

  const match = req.nextUrl.pathname.match(/\/api\/admin\/market-data\/(\d+)\/history/);
  if (!match) {
    throw new HttpError(400, 'Invalid market data symbol id');
  }
  const id = Number(match[1]);
  const limitParam = req.nextUrl.searchParams.get('limit') ?? '200';
  const limit = Math.min(500, Math.max(2, parseInt(limitParam, 10) || 200));

  const rows = await query<HistoryRow[]>(
    `SELECT price, fetched_at FROM market_data_price_history
     WHERE symbol_id = ?
     ORDER BY fetched_at ASC
     LIMIT ?`,
    [id, limit]
  );

  return NextResponse.json({
    points: rows.map((r) => ({
      price: Number(r.price),
      t: r.fetched_at instanceof Date ? r.fetched_at.toISOString() : new Date(String(r.fetched_at)).toISOString(),
    })),
  });
}

export const GET = withApiHandler('admin-market-data-history', getHandler);