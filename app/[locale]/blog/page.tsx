import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import { getPublishedPosts } from '@/lib/posts';
import { searchPosts } from '@/lib/meilisearch';
import { routes } from '@/lib/routes';
import type { Category, Post } from '@/lib/types';
import Header from '@/components/Header';
import BlogListView from '@/components/BlogListView';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Blog | PIPSNOTE',
  description: 'Market analysis, trading guides, and forex/crypto broker reviews.',
  alternates: { languages: { en: '/blog', vi: '/vi/blog' } },
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string; q?: string }>;
}) {
  const { cat, page, q } = await searchParams;

  if (cat) {
    const rest = new URLSearchParams();
    if (q) rest.set('q', q);
    if (page) rest.set('page', page);
    const qs = rest.toString();
    const locale = await getLocale();
    redirect({ href: `${routes.blogCategory(cat)}${qs ? `?${qs}` : ''}`, locale });
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';
  const categories = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  let posts: Post[];
  let total: number;

  if (q) {
    const result = await searchPosts(q, { categorySlug: null, limit: PAGE_SIZE, offset });
    posts = result.items;
    total = result.total;
  } else {
    const result = await getPublishedPosts({ limit: PAGE_SIZE, offset });
    posts = result.items;
    total = result.total;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `${routes.blog}${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <Header siteName={siteName} />
      <BlogListView
        eyebrow="Insights & analysis"
        title="All posts"
        categories={categories}
        posts={posts}
        emptyMessage={q ? `No posts found for "${q}".` : 'No posts yet.'}
        currentPage={currentPage}
        totalPages={totalPages}
        pageHref={pageHref}
      />
      <Footer siteName={siteName} />
    </>
  );
}
