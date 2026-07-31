import { cookies } from 'next/headers';
import { verifyToken, AdminUser } from './auth';
import { HttpError } from './httpError';

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(
  allowedRoles: Array<'superadmin' | 'editor' | 'author'> = ['superadmin']
): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  if (!allowedRoles.includes(user.role)) {
    throw new HttpError(403, 'Forbidden');
  }
  return user;
}
