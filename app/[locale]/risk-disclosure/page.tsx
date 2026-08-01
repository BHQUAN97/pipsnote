// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('riskDisclosure');
  return {
    title: `${t('title')} | PIPSNOTE`,
    description: 'Risk warning for forex and CFD trading content on PIPSNOTE.',
    alternates: { languages: { en: '/risk-disclosure', vi: '/vi/risk-disclosure' } },
  };
}

export const dynamic = 'force-dynamic';

export default async function RiskDisclosurePage() {
  const t = await getTranslations('riskDisclosure');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-9 text-meta text-gray-mid">{t('lastUpdated')}</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>
              <strong className="text-ink">{t('warningLabel')}</strong> {t('intro')}
            </p>

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
                  siteName,
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
              <p>{t('section4Body')}</p>
            </div>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
