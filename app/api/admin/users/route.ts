import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2';

const UserCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid username'),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  role: z.enum(['superadmin', 'editor', 'author']).default('author'),
  is_active: z.boolean().optional(),
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
  await requireAdmin(['superadmin']);

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize')) || 20));
  const offset = (page - 1) * pageSize;

  const [countRows, items] = await Promise.all([
    query<{ total: number }[]>('SELECT COUNT(*) AS total FROM admin_users'),
    query(
      `SELECT id, username, email, role, is_active, last_login_at, updated_at
       FROM admin_users
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
  const user = await requireAdmin(['superadmin']);
  const body = await req.json();
  const parsed = UserCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid user data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const result = await query<ResultSetHeader>(
      `INSERT INTO admin_users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [data.username, data.email, passwordHash, data.role, data.is_active ?? true]
    );

    await query(
      'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        user.id,
        'create_admin_user',
        'admin_user',
        String(result.insertId),
        JSON.stringify({ username: data.username, email: data.email, role: data.role }),
        getClientIp(req),
        req.headers.get('user-agent') ?? null,
      ]
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    throw err;
  }
}

export const GET = withApiHandler('admin-users-list', getHandler);
export const POST = withApiHandler('admin-users-create', postHandler);
