import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import { searchPosts } from '@/lib/meilisearch';
import type { Category, Post } from '@/lib/types';
import Header from '@/components/Header';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBox from '@/components/SearchBox';
import PostCard from '@/components/PostCard';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Blog | PIPSNOTE',
  description: 'Phân tích thị trường, hướng dẫn giao dịch và đánh giá sàn forex/crypto.',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string; q?: string }>;
}) {
  const { cat, page, q } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';
  const categories = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  let posts: Post[];
  let total: number;

  if (q) {
    const result = await searchPosts(q, {
      categorySlug: cat ?? null,
      limit: PAGE_SIZE,
      offset,
    });
    posts = result.items;
    total = result.total;
  } else {
    const where = cat
      ? 'WHERE p.status = "published" AND c.slug = ?'
      : 'WHERE p.status = "published"';
    const countParams = cat ? [cat] : [];
    const listParams = cat ? [cat, PAGE_SIZE, offset] : [PAGE_SIZE, offset];

    const [countRows, listRows] = await Promise.all([
      query<{ total: number }[]>(
        `SELECT COUNT(*) AS total FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
        countParams
      ),
      query<Post[]>(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM posts p
         LEFT JOIN categories c ON c.id = p.category_id
         ${where}
         ORDER BY p.is_featured DESC, p.published_at DESC
         LIMIT ? OFFSET ?`,
        listParams
      ),
    ]);

    posts = listRows;
    total = countRows[0]?.total ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (cat) params.set('cat', cat);
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <Header siteName={siteName} />

      <section className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
            Kiến thức &amp; phân tích
          </span>
          <h1 className="mt-1 mb-9 text-[26px] md:text-[30px]">Tất cả bài viết</h1>

          <SearchBox />
          <CategoryFilter categories={categories} />

          {posts.length === 0 ? (
            <p className="text-sm text-gray-mid">
              {q ? `Không tìm thấy bài viết nào cho "${q}".` : 'Chưa có bài viết nào.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-11 flex flex-wrap justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`flex h-11 min-w-11 items-center justify-center border px-3 text-sm font-medium ${
                    p === currentPage
                      ? 'border-surface-dark bg-surface-dark text-white'
                      : 'border-gray-line'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer siteName={siteName} />
    </>
  );
}
