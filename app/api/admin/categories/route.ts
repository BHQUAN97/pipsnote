import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { Category } from '@/lib/types';

async function getHandler() {
  await requireAdmin(['superadmin', 'editor', 'author']);

  const items = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  return NextResponse.json({ items });
}

export const GET = withApiHandler('admin-categories-list', getHandler);
