import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { assertNotLastSuperadmin } from '@/lib/adminUsers';
import type { ResultSetHeader } from 'mysql2';

const UserUpdateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid username').optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(['superadmin', 'editor', 'author']).optional(),
  is_active: z.boolean().optional(),
});

function isDuplicateEntryError(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY';
}

function isFkRestrictError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === 'ER_ROW_IS_REFERENCED' || code === 'ER_ROW_IS_REFERENCED_2';
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
  const match = req.nextUrl.pathname.match(/\/users\/(\d+)/);
  const id = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid user id');
  }
  return id;
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin']);
  const id = extractId(req);

  const rows = await query<
    { id: number; username: string; email: string; role: string; is_active: number; last_login_at: string | null; created_at: string; updated_at: string }[]
  >(
    'SELECT id, username, email, role, is_active, last_login_at, created_at, updated_at FROM admin_users WHERE id = ? LIMIT 1',
    [id]
  );

  const item = rows[0];
  if (!item) {
    throw new HttpError(404, 'User not found');
  }

  return NextResponse.json(item);
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const id = extractId(req);
  const body = await req.json();
  const parsed = UserUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid user data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if ((data.role && data.role !== 'superadmin') || data.is_active === false) {
    await assertNotLastSuperadmin(id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }
  if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active);
  }
  if (data.password !== undefined) {
    fields.push('password_hash = ?');
    values.push(await bcrypt.hash(data.password, 10));
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'No fields to update');
  }

  try {
    const result = await query<ResultSetHeader>(
      `UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'User not found');
    }

    const changes: Record<string, unknown> = { ...data };
    delete changes.password;
    if (data.password !== undefined) changes.password = '[changed]';

    await query(
      'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        user.id,
        'update_admin_user',
        'admin_user',
        String(id),
        JSON.stringify(changes),
        getClientIp(req),
        req.headers.get('user-agent') ?? null,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    throw err;
  }
}

async function deleteHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const id = extractId(req);

  if (user.id === id) {
    throw new HttpError(400, 'Cannot delete your own account');
  }

  await assertNotLastSuperadmin(id);

  try {
    const result = await query<ResultSetHeader>('DELETE FROM admin_users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'User not found');
    }

    await query(
      'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, 'delete_admin_user', 'admin_user', String(id), null, getClientIp(req), req.headers.get('user-agent') ?? null]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isFkRestrictError(err)) {
      throw new HttpError(409, 'Cannot delete a user who is the author of existing posts');
    }
    throw err;
  }
}

export const GET = withApiHandler('admin-users-get', getHandler);
export const PATCH = withApiHandler('admin-users-update', patchHandler);
export const DELETE = withApiHandler('admin-users-delete', deleteHandler);
