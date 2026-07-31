import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';

function extractId(req: NextRequest): number {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/logs\/(\d+)/);
  if (!match) {
    throw new HttpError(400, 'Invalid log id');
  }
  return Number(match[1]);
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin']);
  const id = extractId(req);

  const rows = await query('SELECT * FROM system_logs WHERE id = ? LIMIT 1', [id]);
  const rowList = rows as Record<string, unknown>[];
  if (!rowList[0]) {
    throw new HttpError(404, 'Log not found');
  }

  return NextResponse.json(rowList[0]);
}

export const GET = withApiHandler('admin-logs-get', getHandler);
