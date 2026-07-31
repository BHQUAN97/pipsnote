import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
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

async function getPost(slug: string): Promise<Post | null> {
  const rows = await query<Post[]>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.username AS author_name
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN admin_users u ON u.id = p.author_id
     WHERE p.slug = ? AND p.status = 'published'
     LIMIT 1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.seo_title || post.title,
    description: post.seo_desc || post.excerpt || undefined,
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  await query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [post.id]);

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
          {post.category_name && (
            <Link
              href={`/blog?cat=${post.category_slug}`}
              className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.06em] text-brand"
            >
              {post.category_name}
            </Link>
          )}
          <h1 className="mb-4 text-[28px] leading-tight md:text-[36px]">{post.title}</h1>
          <div className="mb-9 flex flex-wrap items-center gap-3 text-[12.5px] text-gray-mid">
            {post.author_name && <span>{post.author_name}</span>}
            {post.author_name && <span>·</span>}
            <span>{formatDate(post.published_at)}</span>
            {post.read_time && (
              <>
                <span>·</span>
                <span>{post.read_time} phút đọc</span>
              </>
            )}
          </div>

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
            <h2 className="mb-9 text-[26px] md:text-[30px]">Bài viết liên quan</h2>
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
