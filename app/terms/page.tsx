// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms & Conditions | PIPSNOTE',
  description: 'Terms and conditions for using the PIPSNOTE website.',
};

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-[28px] leading-tight md:text-[36px]">Terms &amp; Conditions</h1>
          <p className="mb-9 text-[12.5px] text-gray-mid">Last updated: August 1, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>
              These Terms &amp; Conditions govern your use of {siteName} (the &quot;Site&quot;).
              By accessing or using the Site, you agree to be bound by these terms. If you do
              not agree, please do not use the Site.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">1. Informational purpose only</h2>
              <p>
                Content on the Site — including articles, broker reviews, comparisons, and
                market commentary — is provided for general informational purposes only and
                does not constitute financial, investment, legal, or tax advice. You should
                consult a licensed professional before making any trading or investment
                decision.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">2. No warranty</h2>
              <p>
                The Site is provided &quot;as is&quot; without warranties of any kind, express
                or implied. We do not guarantee the accuracy, completeness, or timeliness of
                any content, including broker information, ratings, or market data, which may
                change without notice.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">3. Third-party links and brokers</h2>
              <p>
                The Site contains links to third-party broker websites. We do not control and
                are not responsible for the content, products, services, or practices of any
                third party. Some links are affiliate links — see our{' '}
                <a href="/affiliate-disclosure" className="text-brand underline">
                  Affiliate Disclosure
                </a>{' '}
                for details.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">4. Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, {siteName} and its operators shall not
                be liable for any direct, indirect, incidental, or consequential loss or damage
                arising from your use of the Site or reliance on any content published on it,
                including trading losses.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">5. Changes to these terms</h2>
              <p>
                We may update these terms from time to time. Continued use of the Site after
                changes are posted constitutes acceptance of the updated terms.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">6. Contact</h2>
              <p>
                Questions about these terms can be sent to{' '}
                <a href="mailto:hello@pipsnote.com" className="text-brand underline">
                  hello@pipsnote.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
