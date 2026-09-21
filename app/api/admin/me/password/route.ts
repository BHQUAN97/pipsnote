import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import type { RowDataPacket } from 'mysql2';

const PasswordChangeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(200),
});

interface PwRow extends RowDataPacket {
  password_hash: string;
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
  const body = await req.json();
  const parsed = PasswordChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid password data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const rows = await query<PwRow[]>('SELECT password_hash FROM admin_users WHERE id = ? LIMIT 1', [user.id]);
  const row = rows[0];
  if (!row) {
    throw new HttpError(404, 'User not found');
  }

  const valid = await bcrypt.compare(parsed.data.current_password, row.password_hash);
  if (!valid) {
    throw new HttpError(400, 'Current password is incorrect');
  }

  await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [
    await bcrypt.hash(parsed.data.new_password, 10),
    user.id,
  ]);

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'change_password',
      'admin_user',
      String(user.id),
      JSON.stringify({ password: '[changed]' }),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

export const PATCH = withApiHandler('admin-password-change', patchHandler);