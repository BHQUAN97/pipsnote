import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { syncPostSearchIndex, removePostFromIndex } from '@/lib/meilisearch';
import { sanitizeHtml } from '@/lib/sanitize';
import { getPostTags, syncPostTags } from '@/lib/posts';
import type { Post } from '@/lib/types';

const SlugSchema = z
  .string()
  .min(1)
  .max(280)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated');

const PostUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: SlugSchema.optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  content: z.string().min(1).optional(),
  featured_image: z.string().max(500).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  is_featured: z.boolean().optional(),
  read_time: z.number().int().nonnegative().nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_desc: z.string().max(300).nullable().optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
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
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/posts\/(\d+)/);
  if (!match) {
    throw new HttpError(400, 'Invalid post id');
  }
  return Number(match[1]);
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);
  const id = extractId(req);

  const rows = await query<Post[]>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    throw new HttpError(404, 'Post not found');
  }

  const tags = await getPostTags(id);

  return NextResponse.json({ ...rows[0], tags });
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor', 'author']);
  const id = extractId(req);

  const existing = await query<Post[]>('SELECT * FROM posts WHERE id = ? LIMIT 1', [id]);
  if (!existing[0]) {
    throw new HttpError(404, 'Post not found');
  }

  const body = await req.json();
  const parsed = PostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid post data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tag_ids, ...columnData } = parsed.data;
  if (columnData.content !== undefined) {
    columnData.content = sanitizeHtml(columnData.content);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(columnData)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (columnData.status === 'published' && !existing[0].published_at) {
    fields.push('published_at = ?');
    values.push(new Date());
  }

  if (fields.length === 0 && tag_ids === undefined) {
    return NextResponse.json({ success: true });
  }

  if (fields.length > 0) {
    try {
      await query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    } catch (err) {
      if (isDuplicateEntryError(err)) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
      throw err;
    }
  }

  if (tag_ids !== undefined) {
    await syncPostTags(id, tag_ids);
  }

  const data = parsed.data;

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'update_post',
      'post',
      String(id),
      JSON.stringify(data),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  await syncPostSearchIndex(id);

  return NextResponse.json({ success: true });
}

async function deleteHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor', 'author']);
  const id = extractId(req);

  const existing = await query<Post[]>('SELECT id FROM posts WHERE id = ? LIMIT 1', [id]);
  if (!existing[0]) {
    throw new HttpError(404, 'Post not found');
  }

  await query('DELETE FROM posts WHERE id = ?', [id]);

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, 'delete_post', 'post', String(id), getClientIp(req), req.headers.get('user-agent') ?? null]
  );

  await removePostFromIndex(id);

  return NextResponse.json({ success: true });
}

export const GET = withApiHandler('admin-posts-get', getHandler);
export const PATCH = withApiHandler('admin-posts-patch', patchHandler);
export const DELETE = withApiHandler('admin-posts-delete', deleteHandler);
