import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default async function LocaleNotFound() {
  const t = await getTranslations('notFound');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-24 md:py-32">
        <div className="mx-auto max-w-[560px] px-7 text-center">
          <p className="mb-2 font-mono text-sm text-gray-mid">404</p>
          <h1 className="mb-4 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-8 text-sm leading-relaxed text-gray-mid">{t('body')}</p>
          <Link
            href={routes.home}
            className="inline-flex min-h-[44px] items-center rounded-sm bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {t('backHome')}
          </Link>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
