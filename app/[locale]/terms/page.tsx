// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('terms');
  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return {
    title: `${t('title')} | ${siteName}`,
    description: `Terms and conditions for using the ${siteName} website.`,
    alternates: { languages: { en: '/terms', vi: '/vi/terms' } },
  };
}

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const t = await getTranslations('terms');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-9 text-meta text-gray-mid">{t('lastUpdated')}</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>{t('intro', { siteName })}</p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section1Title')}</h2>
              <p>{t('section1Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section2Title')}</h2>
              <p>{t('section2Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section3Title')}</h2>
              <p>
                {t.rich('section3Body', {
                  link: (chunks) => (
                    <Link href="/affiliate-disclosure" className="text-brand underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section4Title')}</h2>
              <p>{t('section4Body', { siteName })}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section5Title')}</h2>
              <p>{t('section5Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section6Title')}</h2>
              <p>
                {t.rich('section6Body', {
                  email: (chunks) => (
                    <a href="mailto:hello@toptrendmarkets.com" className="text-brand underline">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
