import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import type { Broker } from '@/lib/types';
import Header from '@/components/Header';
import BrokerCard from '@/components/BrokerCard';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('brokersList');
  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return {
    title: `${t('metaTitle')} | ${siteName}`,
    description: t('metaDescription'),
    alternates: { languages: { en: '/brokers', vi: '/vi/brokers' } },
  };
}

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const t = await getTranslations('brokersList');
  const tHome = await getTranslations('home');
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  const [countRows, brokers] = await Promise.all([
    query<{ total: number }[]>('SELECT COUNT(*) AS total FROM brokers WHERE is_active = 1'),
    query<Broker[]>(
      `SELECT * FROM brokers WHERE is_active = 1
       ORDER BY is_featured DESC, rating DESC
       LIMIT ? OFFSET ?`,
      [PAGE_SIZE, offset]
    ),
  ]);

  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    return `/brokers${p > 1 ? `?page=${p}` : ''}`;
  }

  return (
    <>
      <Header siteName={siteName} />

      <section className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
            {tHome('tradingPartners')}
          </span>
          <h1 className="mt-1 mb-9 text-h2 md:text-h2-lg">{t('title')}</h1>

          {brokers.length === 0 ? (
            <p className="text-sm text-gray-mid">{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {brokers.map((broker) => (
                <BrokerCard key={broker.id} broker={broker} />
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
