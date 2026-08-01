// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Contact | PIPSNOTE',
  description: 'Get in touch with the PIPSNOTE team.',
  alternates: { languages: { en: '/contact', vi: '/vi/contact' } },
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const t = await getTranslations('contact');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-4 text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
          <p className="mb-9 text-sm leading-relaxed text-gray-mid">{t('intro', { siteName })}</p>

          <div className="border border-gray-line p-6">
            <h2 className="mb-2 text-lg font-semibold text-ink">{t('emailHeading')}</h2>
            <a
              href="mailto:hello@pipsnote.com"
              className="text-sm font-medium text-brand underline"
            >
              hello@pipsnote.com
            </a>
            <p className="mt-3 text-sm leading-relaxed text-gray-mid">{t('responseNote')}</p>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
