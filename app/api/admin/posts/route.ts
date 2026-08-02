import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { syncPostSearchIndex } from '@/lib/meilisearch';
import { sanitizeHtml } from '@/lib/sanitize';
import { syncPostTags } from '@/lib/posts';
import type { ResultSetHeader } from 'mysql2';

const SlugSchema = z
  .string()
  .min(1)
  .max(280)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated');

const PostCreateSchema = z.object({
  title: z.string().min(1).max(255),
  slug: SlugSchema,
  excerpt: z.string().max(2000).nullable().optional(),
  content: z.string().min(1),
  featured_image: z.string().max(500).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
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

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize')) || 20));
  const status = params.get('status');
  const offset = (page - 1) * pageSize;

  const where = status ? 'WHERE p.status = ?' : '';
  const whereParams = status ? [status] : [];

  const [countRows, items] = await Promise.all([
    query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM posts p ${where}`,
      whereParams
    ),
    query(
      `SELECT p.id, p.title, p.slug, p.status, p.is_featured, p.view_count,
              p.category_id, c.name AS category_name, p.published_at, p.updated_at
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, pageSize, offset]
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
  const user = await requireAdmin(['superadmin', 'editor', 'author']);
  const body = await req.json();
  const parsed = PostCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid post data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const publishedAt = data.status === 'published' ? new Date() : null;
  const cleanContent = sanitizeHtml(data.content);

  try {
    const result = await query<ResultSetHeader>(
      `INSERT INTO posts
        (title, slug, excerpt, content, featured_image, author_id, category_id, status,
         is_featured, read_time, seo_title, seo_desc, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.slug,
        data.excerpt ?? null,
        cleanContent,
        data.featured_image ?? null,
        user.id,
        data.category_id ?? null,
        data.status,
        data.is_featured ?? false,
        data.read_time ?? null,
        data.seo_title ?? null,
        data.seo_desc ?? null,
        publishedAt,
      ]
    );

    await query(
      'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        user.id,
        'create_post',
        'post',
        String(result.insertId),
        JSON.stringify(data),
        getClientIp(req),
        req.headers.get('user-agent') ?? null,
      ]
    );

    if (data.tag_ids) {
      await syncPostTags(result.insertId, data.tag_ids);
    }

    await syncPostSearchIndex(result.insertId);

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    throw err;
  }
}

export const GET = withApiHandler('admin-posts-list', getHandler);
export const POST = withApiHandler('admin-posts-create', postHandler);
