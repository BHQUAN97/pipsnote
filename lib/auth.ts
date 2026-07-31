import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';
import type { RowDataPacket } from 'mysql2';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'editor' | 'author';
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

interface AdminUserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'superadmin' | 'editor' | 'author';
  is_active: number;
}

const TOKEN_TTL = '24h';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<LoginResult> {
  const rows = await query<AdminUserRow[]>(
    'SELECT id, username, email, password_hash, role, is_active FROM admin_users WHERE username = ? LIMIT 1',
    [username]
  );
  const row = rows[0];

  if (!row || !row.is_active) {
    return { success: false, error: 'Invalid username or password' };
  }

  const isValid = await bcrypt.compare(password, row.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [row.id]);

  return {
    success: true,
    user: { id: row.id, username: row.username, email: row.email, role: row.role },
  };
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminUser;
  } catch {
    return null;
  }
}
