import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import { getPublishedPosts } from '@/lib/posts';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';
import Header from '@/components/Header';
import BlogListView from '@/components/BlogListView';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

async function getCategory(slug: string): Promise<Category | null> {
  const rows = await query<Category[]>('SELECT * FROM categories WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};

  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return {
    title: `${category.name} | ${siteName} Blog`,
    description:
      category.description ||
      `${category.name} articles — market analysis, trading guides, and broker reviews.`,
    alternates: {
      languages: {
        en: `/blog/category/${slug}`,
        vi: `/vi/blog/category/${slug}`,
      },
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const t = await getTranslations('blogList');
  const tHome = await getTranslations('home');

  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';
  const categories = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  const { items: posts, total } = await getPublishedPosts({
    categorySlug: slug,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    return `${routes.blogCategory(slug)}${p > 1 ? `?page=${p}` : ''}`;
  }

  return (
    <>
      <Header siteName={siteName} />
      <BlogListView
        eyebrow={tHome('insightsAnalysis')}
        title={category.name}
        categories={categories}
        posts={posts}
        emptyMessage={t('emptyCategory')}
        currentPage={currentPage}
        totalPages={totalPages}
        pageHref={pageHref}
      />
      <Footer siteName={siteName} />
    </>
  );
}
