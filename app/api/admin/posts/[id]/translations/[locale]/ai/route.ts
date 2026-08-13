import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/httpError';
import { routing } from '@/i18n/routing';
import { translatePostContent } from '@/lib/ai/translate';
import { upsertPostTranslation, getPostTranslation } from '@/lib/postTranslations';
import type { Post } from '@/lib/types';

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
    /^\/api\/admin\/posts\/(\d+)\/translations\/([a-z-]+)\/ai/
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

async function postHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin', 'editor']);
  const { postId, locale } = extractParams(req);

  const rows = await query<Post[]>('SELECT * FROM posts WHERE id = ? LIMIT 1', [postId]);
  const post = rows[0];
  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  const translated = await translatePostContent({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    seoTitle: post.seo_title,
    seoDesc: post.seo_desc,
    targetLocale: locale,
  });

  await upsertPostTranslation(
    postId,
    locale,
    {
      title: translated.title,
      excerpt: translated.excerpt,
      content: translated.content,
      seo_title: translated.seoTitle,
      seo_desc: translated.seoDesc,
      status: 'draft',
    },
    { source: 'ai', translatedBy: user.id }
  );

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'ai_translate_post',
      'post_translation',
      `${postId}:${locale}`,
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  const translation = await getPostTranslation(postId, locale);
  return NextResponse.json(translation);
}

export const POST = withApiHandler('admin-post-translation-ai', postHandler);
