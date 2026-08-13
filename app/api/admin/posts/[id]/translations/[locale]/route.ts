import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { sanitizeHtml } from '@/lib/sanitize';
import { routing } from '@/i18n/routing';
import {
  getPostTranslation,
  upsertPostTranslation,
  deletePostTranslation,
} from '@/lib/postTranslations';
import type { Post } from '@/lib/types';

const TranslationUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  content: z.string().min(1).optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_desc: z.string().max(300).nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function extractParams(req: NextRequest): { postId: number; locale: string } {
  const match = req.nextUrl.pathname.match(
    /^\/api\/admin\/posts\/(\d+)\/translations\/([a-z-]+)/
  );
  if (!match) {
    throw new HttpError(400, 'Invalid post id or locale');
  }
  const locale = match[2];
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    throw new HttpError(400, 'Unsupported locale');
  }
  return { postId: Number(match[1]), locale };
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);
  const { postId, locale } = extractParams(req);

  const translation = await getPostTranslation(postId, locale);
  if (!translation) {
    throw new HttpError(404, 'Translation not found');
  }

  return NextResponse.json(translation);
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const { postId, locale } = extractParams(req);

  const post = await query<Post[]>('SELECT id FROM posts WHERE id = ? LIMIT 1', [postId]);
  if (!post[0]) {
    throw new HttpError(404, 'Post not found');
  }

  const body = await req.json();
  const parsed = TranslationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid translation data', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await getPostTranslation(postId, locale);
  if (!existing) {
    throw new HttpError(404, 'Translation not found — use the AI translate endpoint first');
  }

  const data = parsed.data;
  const content = data.content !== undefined ? sanitizeHtml(data.content) : existing.content;

  await upsertPostTranslation(
    postId,
    locale,
    {
      title: data.title ?? existing.title,
      excerpt: data.excerpt !== undefined ? data.excerpt : existing.excerpt,
      content,
      seo_title: data.seo_title !== undefined ? data.seo_title : existing.seo_title,
      seo_desc: data.seo_desc !== undefined ? data.seo_desc : existing.seo_desc,
      status: data.status ?? existing.status,
    },
    { source: 'human', translatedBy: user.id }
  );

  const action = data.status === 'published' ? 'publish_post_translation' : 'update_post_translation';

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      action,
      'post_translation',
      `${postId}:${locale}`,
      JSON.stringify(data),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

async function deleteHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const { postId, locale } = extractParams(req);

  const existing = await getPostTranslation(postId, locale);
  if (!existing) {
    throw new HttpError(404, 'Translation not found');
  }

  await deletePostTranslation(postId, locale);

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'delete_post_translation',
      'post_translation',
      `${postId}:${locale}`,
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true });
}

export const GET = withApiHandler('admin-post-translation-get', getHandler);
export const PATCH = withApiHandler('admin-post-translation-patch', patchHandler);
export const DELETE = withApiHandler('admin-post-translation-delete', deleteHandler);
