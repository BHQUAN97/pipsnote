import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';

async function healthHandler(_req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pipsnote',
  });
}

export const GET = withApiHandler('health', healthHandler);
