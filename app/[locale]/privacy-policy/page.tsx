// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | PIPSNOTE',
  description: 'How PIPSNOTE collects, uses, and protects your personal data.',
  alternates: { languages: { en: '/privacy-policy', vi: '/vi/privacy-policy' } },
};

export const dynamic = 'force-dynamic';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacyPolicy');
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
              <p>{t('section3Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section4Title')}</h2>
              <p>
                {t.rich('section4Body', {
                  email: (chunks) => (
                    <a href="mailto:hello@pipsnote.com" className="text-brand underline">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section5Title')}</h2>
              <p>{t('section5Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section6Title')}</h2>
              <p>{t('section6Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section7Title')}</h2>
              <p>{t('section7Body')}</p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('section8Title')}</h2>
              <p>
                {t.rich('section8Body', {
                  email: (chunks) => (
                    <a href="mailto:hello@pipsnote.com" className="text-brand underline">
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
