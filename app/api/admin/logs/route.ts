import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin']);

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const level = params.get('level');
  const moduleName = params.get('module');
  const q = params.get('q');
  const from = params.get('from');
  const to = params.get('to');

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (level && LEVELS.includes(level)) {
    conditions.push('level = ?');
    values.push(level);
  }
  if (moduleName) {
    conditions.push('module = ?');
    values.push(moduleName);
  }
  if (q) {
    conditions.push('message LIKE ?');
    values.push(`%${q}%`);
  }
  if (from) {
    conditions.push('created_at >= ?');
    values.push(from);
  }
  if (to) {
    conditions.push('created_at <= ?');
    values.push(to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows, items] = await Promise.all([
    query<{ total: number }[]>(`SELECT COUNT(*) AS total FROM system_logs ${where}`, values),
    query(
      `SELECT id, level, message, module, request_id, url, method, status_code, created_at
       FROM system_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    ),
  ]);

  return NextResponse.json({
    items,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  });
}

export const GET = withApiHandler('admin-logs-list', getHandler);
