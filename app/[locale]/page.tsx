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
import MarqueeBand from '@/components/MarqueeBand';
import BrokerGrid from '@/components/BrokerGrid';
import BlogGrid from '@/components/BlogGrid';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';
import ParticleField from '@/components/ParticleField';
import MotionController from '@/components/MotionController';

export const dynamic = 'force-dynamic';

const SECTION_WORDS = ['Forex', 'CFD', 'Indices', 'Commodities', 'Crypto'];

export default async function Home() {
  const t = await getTranslations('home');
  const tCat = await getTranslations('categoryFilter');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';
  const showTicker = settings['layout.show_ticker'] !== 'false';
  const tickerItems = showTicker ? await getMarketDataSnapshot() : [];
  const newsletterBg = settings['bg.newsletter'] || undefined;
  const categories = await query<Category[]>('SELECT * FROM categories ORDER BY name');

  return (
    <>
      <ParticleField />
      <MotionController />
      <Header siteName={siteName} />
      <TickerStrip show={showTicker} items={tickerItems} />

      <Hero />

      {/* Infinite editorial marquee band */}
      <MarqueeBand items={SECTION_WORDS} />

      {/* 01 — Trading partners */}
      <section id="brokers" className="relative overflow-hidden bg-mesh py-20 md:py-28" data-fade>
        <div className="mx-auto max-w-[1180px] px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="flex items-center gap-3">
                <span className="sec-num font-mono">01</span>
                <span className="c-eyebrow">{t('tradingPartners')}</span>
              </span>
              <h2 className="mt-3 h-section text-white">{t('topRatedBrokers')}</h2>
            </div>
            <Link
              href={routes.brokers}
              className="group hover-line pb-1 text-body-lg font-semibold text-gray-mid transition-colors hover:text-ink"
            >
              {t('viewFullComparison')}
              <span className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <BrokerGrid limit={6} />
        </div>
      </section>

      {/* 02 — Insights & analysis */}
      <section id="blog" className="relative overflow-hidden border-y border-gray-line bg-gray-bg py-20 md:py-28" data-fade>
        <div className="mx-auto max-w-[1180px] px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="flex items-center gap-3">
                <span className="sec-num font-mono">02</span>
                <span className="c-eyebrow">{t('insightsAnalysis')}</span>
              </span>
              <h2 className="mt-3 h-section text-white">{t('latestPosts')}</h2>
            </div>
            <Link
              href={routes.blog}
              className="group hover-line pb-1 text-body-lg font-semibold text-gray-mid transition-colors hover:text-ink"
            >
              {t('viewAll')}
              <span className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <div className="mb-10 flex flex-wrap gap-3">
            <Link
              href={routes.blog}
              className="rounded-full border border-brand bg-brand px-5 py-2.5 text-sm font-medium text-white"
            >
              {tCat('all')}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={routes.blogCategory(cat.slug)}
                className="rounded-full border border-gray-line px-5 py-2.5 text-sm font-medium text-gray-mid transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <BlogGrid limit={6} />
        </div>
      </section>

      {/* 03 — Newsletter */}
      <section className="py-20 md:py-28" data-fade>
        <div className="mx-auto max-w-[1180px] px-7">
          <Newsletter bgUrl={newsletterBg} />
        </div>
      </section>

      <Footer siteName={siteName} />
    </>
  );
}