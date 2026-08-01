import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pipsnote.com';

export const dynamic = 'force-dynamic';

function alternates(path: string) {
  return {
    languages: {
      en: `${BASE_URL}${path}`,
      vi: `${BASE_URL}/vi${path === '/' ? '' : path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, brokers, categories] = await Promise.all([
    query<{ slug: string; published_at: string | null }[]>(
      `SELECT slug, published_at FROM posts WHERE status = 'published'`
    ),
    query<{ slug: string }[]>('SELECT slug FROM brokers WHERE is_active = 1'),
    query<Category[]>('SELECT * FROM categories ORDER BY name'),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}${routes.home}`, changeFrequency: 'daily', priority: 1, alternates: alternates(routes.home) },
    { url: `${BASE_URL}${routes.blog}`, changeFrequency: 'daily', priority: 0.8, alternates: alternates(routes.blog) },
    { url: `${BASE_URL}${routes.brokers}`, changeFrequency: 'weekly', priority: 0.8, alternates: alternates(routes.brokers) },
    { url: `${BASE_URL}${routes.about}`, changeFrequency: 'monthly', priority: 0.5, alternates: alternates(routes.about) },
    { url: `${BASE_URL}${routes.instruction}`, changeFrequency: 'monthly', priority: 0.5, alternates: alternates(routes.instruction) },
    { url: `${BASE_URL}${routes.terms}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(routes.terms) },
    { url: `${BASE_URL}${routes.privacyPolicy}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(routes.privacyPolicy) },
    { url: `${BASE_URL}${routes.contact}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(routes.contact) },
    { url: `${BASE_URL}${routes.affiliateDisclosure}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(routes.affiliateDisclosure) },
    { url: `${BASE_URL}${routes.riskDisclosure}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(routes.riskDisclosure) },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}${routes.blogCategory(c.slug)}`,
    changeFrequency: 'daily',
    priority: 0.7,
    alternates: alternates(routes.blogCategory(c.slug)),
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}${routes.post(p.slug)}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
    alternates: alternates(routes.post(p.slug)),
  }));

  const brokerRoutes: MetadataRoute.Sitemap = brokers.map((b) => ({
    url: `${BASE_URL}${routes.broker(b.slug)}`,
    changeFrequency: 'weekly',
    priority: 0.6,
    alternates: alternates(routes.broker(b.slug)),
  }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...brokerRoutes];
}
