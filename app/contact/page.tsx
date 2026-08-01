// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Contact | PIPSNOTE',
  description: 'Get in touch with the PIPSNOTE team.',
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-4 text-[28px] leading-tight md:text-[36px]">Contact us</h1>
          <p className="mb-9 text-sm leading-relaxed text-gray-mid">
            Have a question, feedback, or a correction to report on {siteName}? We&apos;d like
            to hear from you.
          </p>

          <div className="border border-gray-line p-6">
            <h2 className="mb-2 text-lg font-semibold text-ink">Email</h2>
            <a
              href="mailto:hello@pipsnote.com"
              className="text-sm font-medium text-brand underline"
            >
              hello@pipsnote.com
            </a>
            <p className="mt-3 text-sm leading-relaxed text-gray-mid">
              We aim to respond to all inquiries within a few business days.
            </p>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
