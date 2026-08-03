import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireInternalSecret } from '@/lib/internalAuth';
import { refreshMarketData } from '@/lib/marketData/refresh';

async function postHandler(req: NextRequest) {
  requireInternalSecret(req);
  const result = await refreshMarketData();
  return NextResponse.json({ success: true, ...result });
}

export const POST = withApiHandler('internal-market-data-refresh', postHandler);
