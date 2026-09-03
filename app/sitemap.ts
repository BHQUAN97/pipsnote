import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { getSiteUrl } from '@/lib/siteUrl';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

function alternates(baseUrl: string, path: string) {
  return {
    languages: {
      en: `${baseUrl}${path}`,
      vi: `${baseUrl}/vi${path === '/' ? '' : path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const [posts, brokers, categories] = await Promise.all([
    query<{ slug: string; published_at: string | null }[]>(
      `SELECT slug, published_at FROM posts WHERE status = 'published'`
    ),
    query<{ slug: string }[]>('SELECT slug FROM brokers WHERE is_active = 1'),
    query<Category[]>('SELECT * FROM categories ORDER BY name'),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}${routes.home}`, changeFrequency: 'daily', priority: 1, alternates: alternates(baseUrl, routes.home) },
    { url: `${baseUrl}${routes.blog}`, changeFrequency: 'daily', priority: 0.8, alternates: alternates(baseUrl, routes.blog) },
    { url: `${baseUrl}${routes.brokers}`, changeFrequency: 'weekly', priority: 0.8, alternates: alternates(baseUrl, routes.brokers) },
    { url: `${baseUrl}${routes.about}`, changeFrequency: 'monthly', priority: 0.5, alternates: alternates(baseUrl, routes.about) },
    { url: `${baseUrl}${routes.instruction}`, changeFrequency: 'monthly', priority: 0.5, alternates: alternates(baseUrl, routes.instruction) },
    { url: `${baseUrl}${routes.terms}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(baseUrl, routes.terms) },
    { url: `${baseUrl}${routes.privacyPolicy}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(baseUrl, routes.privacyPolicy) },
    { url: `${baseUrl}${routes.contact}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(baseUrl, routes.contact) },
    { url: `${baseUrl}${routes.affiliateDisclosure}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(baseUrl, routes.affiliateDisclosure) },
    { url: `${baseUrl}${routes.riskDisclosure}`, changeFrequency: 'yearly', priority: 0.2, alternates: alternates(baseUrl, routes.riskDisclosure) },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}${routes.blogCategory(c.slug)}`,
    changeFrequency: 'daily',
    priority: 0.7,
    alternates: alternates(baseUrl, routes.blogCategory(c.slug)),
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${baseUrl}${routes.post(p.slug)}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
    alternates: alternates(baseUrl, routes.post(p.slug)),
  }));

  const brokerRoutes: MetadataRoute.Sitemap = brokers.map((b) => ({
    url: `${baseUrl}${routes.broker(b.slug)}`,
    changeFrequency: 'weekly',
    priority: 0.6,
    alternates: alternates(baseUrl, routes.broker(b.slug)),
  }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...brokerRoutes];
}
