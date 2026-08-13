import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import { routes } from '@/lib/routes';
import { getPostTags } from '@/lib/posts';
import type { Post } from '@/lib/types';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import RiskDisclaimer from '@/components/RiskDisclaimer';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

async function getPost(slug: string, locale: string): Promise<Post | null> {
  const rows = await query<Post[]>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.username AS author_name,
            COALESCE(pt.title, p.title) AS title,
            COALESCE(pt.excerpt, p.excerpt) AS excerpt,
            COALESCE(pt.content, p.content) AS content,
            COALESCE(pt.seo_title, p.seo_title) AS seo_title,
            COALESCE(pt.seo_desc, p.seo_desc) AS seo_desc
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN admin_users u ON u.id = p.author_id
     LEFT JOIN post_translations pt
       ON pt.post_id = p.id AND pt.locale = ? AND pt.status = 'published'
     WHERE p.slug = ? AND p.status = 'published'
     LIMIT 1`,
    [locale, slug]
  );
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await getPost(slug, locale);
  if (!post) return {};

  return {
    title: post.seo_title || post.title,
    description: post.seo_desc || post.excerpt || undefined,
    alternates: {
      languages: { en: `/blog/${slug}`, vi: `/vi/blog/${slug}` },
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const post = await getPost(slug, locale);
  if (!post) notFound();

  await query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [post.id]);

  const tags = await getPostTags(post.id);
  const t = await getTranslations('blogDetail');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  const related = post.category_id
    ? await query<Post[]>(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM posts p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'published' AND p.category_id = ? AND p.id != ?
         ORDER BY p.published_at DESC
         LIMIT 3`,
        [post.category_id, post.id]
      )
    : [];

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          {post.featured_image && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden border border-gray-line bg-gray-bg">
              <Image
                src={post.featured_image}
                alt={post.title}
                fill
                sizes="(min-width: 760px) 760px, 100vw"
                priority
                className="object-cover"
              />
            </div>
          )}
          {post.category_name && (
            <Link
              href={routes.blogCategory(post.category_slug!)}
              className="mb-3 inline-block font-mono text-label uppercase tracking-[0.06em] text-brand"
            >
              {post.category_name}
            </Link>
          )}
          <h1 className="mb-4 text-h1 leading-tight md:text-h1-lg">{post.title}</h1>
          <div className="mb-9 flex flex-wrap items-center gap-3 text-meta text-gray-mid">
            {post.author_name && <span>{post.author_name}</span>}
            {post.author_name && <span>·</span>}
            <span>{formatDate(post.published_at)}</span>
            {post.read_time && (
              <>
                <span>·</span>
                <span>{post.read_time} min read</span>
              </>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mb-9 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-sm border border-gray-line px-2.5 py-1 font-mono text-label uppercase tracking-[0.06em] text-gray-mid"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-12 border-t border-gray-line pt-6">
            <RiskDisclaimer siteName={siteName} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-gray-line bg-gray-bg py-16 md:py-[72px]">
          <div className="mx-auto max-w-[1180px] px-7">
            <h2 className="mb-9 text-h2 md:text-h2-lg">{t('relatedPosts')}</h2>
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer siteName={siteName} />
    </>
  );
}
