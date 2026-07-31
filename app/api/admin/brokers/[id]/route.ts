import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import type { Broker } from '@/lib/types';

const SlugSchema = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated');

const BrokerUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: SlugSchema.optional(),
  type: z.enum(['forex', 'crypto', 'stock', 'all']).optional(),
  logo_url: z.string().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  badge: z.string().max(50).nullable().optional(),
  min_deposit: z.string().max(50).nullable().optional(),
  leverage: z.string().max(50).nullable().optional(),
  spread_from: z.string().max(50).nullable().optional(),
  affiliate_url: z.string().max(1000).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

function isDuplicateEntryError(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY';
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function extractId(req: NextRequest): number {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/brokers\/(\d+)/);
  if (!match) {
    throw new HttpError(400, 'Invalid broker id');
  }
  return Number(match[1]);
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor']);
  const id = extractId(req);

  const rows = await query<Broker[]>('SELECT * FROM brokers WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) {
    throw new HttpError(404, 'Broker not found');
  }

  return NextResponse.json(rows[0]);
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const id = extractId(req);

  const existing = await query<Broker[]>('SELECT id FROM brokers WHERE id = ? LIMIT 1', [id]);
  if (!existing[0]) {
    throw new HttpError(404, 'Broker not found');
  }

  const body = await req.json();
  const parsed = BrokerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid broker data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ success: true });
  }

  try {
    await query(`UPDATE brokers SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    throw err;
  }

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'update_broker',
      'broker',
      String(id),
      JSON.stringify(data),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

async function deleteHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const id = extractId(req);

  const existing = await query<Broker[]>('SELECT id FROM brokers WHERE id = ? LIMIT 1', [id]);
  if (!existing[0]) {
    throw new HttpError(404, 'Broker not found');
  }

  await query('DELETE FROM brokers WHERE id = ?', [id]);

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, 'delete_broker', 'broker', String(id), getClientIp(req), req.headers.get('user-agent') ?? null]
  );

  return NextResponse.json({ success: true });
}

export const GET = withApiHandler('admin-brokers-get', getHandler);
export const PATCH = withApiHandler('admin-brokers-patch', patchHandler);
export const DELETE = withApiHandler('admin-brokers-delete', deleteHandler);
