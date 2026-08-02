import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { reorderRow } from '@/lib/reorder';
import { HttpError } from '@/lib/httpError';

const ReorderSchema = z.object({
  direction: z.enum(['up', 'down']),
});

function extractId(req: NextRequest): number {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/posts\/(\d+)\/reorder/);
  if (!match) {
    throw new HttpError(400, 'Invalid post id');
  }
  return Number(match[1]);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor', 'author']);
  const id = extractId(req);

  const body = await req.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid reorder request', details: parsed.error.issues },
      { status: 400 }
    );
  }

  await reorderRow('posts', id, parsed.data.direction);

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'reorder_post',
      'post',
      String(id),
      JSON.stringify({ direction: parsed.data.direction }),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

export const PATCH = withApiHandler('admin-posts-reorder', patchHandler);
