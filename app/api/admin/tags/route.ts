import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { slugify } from '@/lib/slugify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

interface Tag extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
}

const TagCreateSchema = z.object({
  name: z.string().min(1).max(50),
});

async function getHandler() {
  await requireAdmin(['superadmin', 'editor', 'author']);

  const items = await query<Tag[]>('SELECT id, name, slug FROM tags ORDER BY name');

  return NextResponse.json({ items });
}

async function postHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);

  const body = await req.json();
  const parsed = TagCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid tag data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);

  const existing = await query<Tag[]>('SELECT id, name, slug FROM tags WHERE slug = ? LIMIT 1', [
    slug,
  ]);

  if (existing[0]) {
    return NextResponse.json(existing[0], { status: 200 });
  }

  const result = await query<ResultSetHeader>(
    'INSERT INTO tags (name, slug) VALUES (?, ?)',
    [name, slug]
  );

  return NextResponse.json({ id: result.insertId, name, slug }, { status: 201 });
}

export const GET = withApiHandler('admin-tags-list', getHandler);
export const POST = withApiHandler('admin-tags-create', postHandler);
