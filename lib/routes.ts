export const routes = {
  home: '/',
  blog: '/blog',
  blogCategory: (slug: string) => `/blog/category/${slug}`,
  post: (slug: string) => `/blog/${slug}`,
  brokers: '/brokers',
  broker: (slug: string) => `/brokers/${slug}`,
  go: (slug: string) => `/go/${slug}`,
  terms: '/terms',
  privacyPolicy: '/privacy-policy',
  contact: '/contact',
  affiliateDisclosure: '/affiliate-disclosure',
  riskDisclosure: '/risk-disclosure',
} as const;
