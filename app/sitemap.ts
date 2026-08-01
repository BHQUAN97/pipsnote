import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pipsnote.com';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, brokers, categories] = await Promise.all([
    query<{ slug: string; published_at: string | null }[]>(
      `SELECT slug, published_at FROM posts WHERE status = 'published'`
    ),
    query<{ slug: string }[]>('SELECT slug FROM brokers WHERE is_active = 1'),
    query<Category[]>('SELECT * FROM categories ORDER BY name'),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}${routes.home}`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}${routes.blog}`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}${routes.brokers}`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}${routes.terms}`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}${routes.privacyPolicy}`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}${routes.contact}`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}${routes.affiliateDisclosure}`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}${routes.riskDisclosure}`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}${routes.blogCategory(c.slug)}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}${routes.post(p.slug)}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const brokerRoutes: MetadataRoute.Sitemap = brokers.map((b) => ({
    url: `${BASE_URL}${routes.broker(b.slug)}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...brokerRoutes];
}
