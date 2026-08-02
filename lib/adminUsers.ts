import { query } from './db';
import { HttpError } from './httpError';

export async function assertNotLastSuperadmin(userId: number): Promise<void> {
  const rows = await query<{ role: string; is_active: number }[]>(
    'SELECT role, is_active FROM admin_users WHERE id = ? LIMIT 1',
    [userId]
  );
  const target = rows[0];
  if (!target || target.role !== 'superadmin' || !target.is_active) return;

  const countRows = await query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM admin_users WHERE role = 'superadmin' AND is_active = TRUE AND id != ?",
    [userId]
  );
  if ((countRows[0]?.total ?? 0) === 0) {
    throw new HttpError(409, 'Cannot remove the last active superadmin');
  }
}
