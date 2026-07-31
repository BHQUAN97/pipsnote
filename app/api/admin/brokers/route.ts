import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2';

const SlugSchema = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated');

const BrokerCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
  type: z.enum(['forex', 'crypto', 'stock', 'all']).default('forex'),
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

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor']);

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize')) || 20));
  const offset = (page - 1) * pageSize;

  const [countRows, items] = await Promise.all([
    query<{ total: number }[]>('SELECT COUNT(*) AS total FROM brokers'),
    query(
      `SELECT id, name, slug, type, badge, rating, is_active, is_featured, click_count, updated_at
       FROM brokers
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    ),
  ]);

  return NextResponse.json({
    items,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  });
}

async function postHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const body = await req.json();
  const parsed = BrokerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid broker data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const result = await query<ResultSetHeader>(
      `INSERT INTO brokers
        (name, slug, type, logo_url, description, badge, min_deposit, leverage, spread_from,
         affiliate_url, rating, is_active, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.type,
        data.logo_url ?? null,
        data.description ?? null,
        data.badge ?? null,
        data.min_deposit ?? null,
        data.leverage ?? null,
        data.spread_from ?? null,
        data.affiliate_url ?? null,
        data.rating ?? null,
        data.is_active ?? true,
        data.is_featured ?? false,
      ]
    );

    await query(
      'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        user.id,
        'create_broker',
        'broker',
        String(result.insertId),
        JSON.stringify(data),
        getClientIp(req),
        req.headers.get('user-agent') ?? null,
      ]
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    throw err;
  }
}

export const GET = withApiHandler('admin-brokers-list', getHandler);
export const POST = withApiHandler('admin-brokers-create', postHandler);
