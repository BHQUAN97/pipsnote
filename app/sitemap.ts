import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pipsnote.com';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, brokers] = await Promise.all([
    query<{ slug: string; published_at: string | null }[]>(
      `SELECT slug, published_at FROM posts WHERE status = 'published'`
    ),
    query<{ slug: string }[]>('SELECT slug FROM brokers WHERE is_active = 1'),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/brokers`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const brokerRoutes: MetadataRoute.Sitemap = brokers.map((b) => ({
    url: `${BASE_URL}/brokers/${b.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...brokerRoutes];
}
