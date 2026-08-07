import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { refreshMarketData } from '@/lib/marketData/refresh';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function postHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);

  const result = await refreshMarketData();

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'refresh_market_data',
      'market_data_symbol',
      JSON.stringify(result),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json(result);
}

export const POST = withApiHandler('admin-market-data-refresh', postHandler);
