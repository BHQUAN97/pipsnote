// Boilerplate content — pending copywriting review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('instruction');
  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return {
    title: `${t('title')} | ${siteName}`,
    description: t('intro', { siteName }),
    alternates: { languages: { en: '/instruction', vi: '/vi/instruction' } },
  };
}

export const dynamic = 'force-dynamic';

export default async function InstructionPage() {
  const t = await getTranslations('instruction');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  const steps = [
    { title: t('step1Title'), body: t('step1Body') },
    { title: t('step2Title'), body: t('step2Body') },
    { title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-4 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-9 text-sm leading-relaxed text-gray-mid">{t('intro', { siteName })}</p>

          <ol className="space-y-6">
            {steps.map((step, i) => (
              <li key={step.title} className="border border-gray-line p-6">
                <h2 className="mb-2 text-lg font-semibold text-ink">
                  {i + 1}. {step.title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-mid">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
