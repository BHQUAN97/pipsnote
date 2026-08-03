import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/settings';
import { getMarketDataSnapshot } from '@/lib/marketData/getSnapshot';
import { query } from '@/lib/db';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';
import Header from '@/components/Header';
import TickerStrip from '@/components/TickerStrip';
import Hero from '@/components/Hero';
import BrokerGrid from '@/components/BrokerGrid';
import BlogGrid from '@/components/BlogGrid';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const t = await getTranslations('home');
  const tCat = await getTranslations('categoryFilter');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';
  const showTicker = settings['layout.show_ticker'] !== 'false';
  const tickerItems = showTicker ? await getMarketDataSnapshot() : [];
  const categories = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  return (
    <>
      <Header siteName={siteName} />
      <TickerStrip show={showTicker} items={tickerItems} />
      <Hero />

      <section id="brokers" className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
                {t('tradingPartners')}
              </span>
              <h2 className="mt-1 text-h2 md:text-h2-lg">{t('topRatedBrokers')}</h2>
            </div>
            <Link
              href={routes.brokers}
              className="border-b-2 border-brand pb-0.5 text-nav font-semibold"
            >
              {t('viewFullComparison')}
            </Link>
          </div>
          <BrokerGrid limit={6} />
        </div>
      </section>

      <section id="blog" className="border-y border-gray-line bg-gray-bg py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
                {t('insightsAnalysis')}
              </span>
              <h2 className="mt-1 text-h2 md:text-h2-lg">{t('latestPosts')}</h2>
            </div>
            <Link
              href={routes.blog}
              className="border-b-2 border-brand pb-0.5 text-nav font-semibold"
            >
              {t('viewAll')}
            </Link>
          </div>
          <div className="mb-11 flex flex-wrap gap-3">
            <Link
              href={routes.blog}
              className="border border-surface-dark bg-surface-dark px-4.5 py-2.5 text-sm font-medium text-white"
            >
              {tCat('all')}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={routes.blogCategory(cat.slug)}
                className="border border-gray-line px-4.5 py-2.5 text-sm font-medium"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <BlogGrid limit={6} />
        </div>
      </section>

      <section className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <Newsletter />
        </div>
      </section>

      <Footer siteName={siteName} />
    </>
  );
}
