// Boilerplate content — pending copywriting review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return {
    title: `${t('title')} | ${siteName}`,
    description: t('intro', { siteName }),
    alternates: { languages: { en: '/about', vi: '/vi/about' } },
  };
}

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const t = await getTranslations('about');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-4 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-9 text-sm leading-relaxed text-gray-mid">{t('intro', { siteName })}</p>

          <div className="space-y-8">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('missionTitle')}</h2>
              <p className="text-sm leading-relaxed text-gray-mid">{t('missionBody', { siteName })}</p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t('approachTitle')}</h2>
              <p className="text-sm leading-relaxed text-gray-mid">{t('approachBody')}</p>
            </section>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
