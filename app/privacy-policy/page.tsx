// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | PIPSNOTE',
  description: 'How PIPSNOTE collects, uses, and protects your personal data.',
};

export const dynamic = 'force-dynamic';

export default async function PrivacyPolicyPage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-[28px] leading-tight md:text-[36px]">Privacy Policy</h1>
          <p className="mb-9 text-[12.5px] text-gray-mid">Last updated: August 1, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>
              This Privacy Policy explains how {siteName} (&quot;we&quot;, &quot;us&quot;)
              collects, uses, and protects information when you visit the Site. We aim to
              comply with the EU General Data Protection Regulation (GDPR) and similar
              regional privacy laws.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">1. Data we collect</h2>
              <p>
                We may collect: (a) information you voluntarily submit, such as your email
                address when subscribing to our newsletter or contacting us; (b) technical
                data collected automatically, such as IP address, browser type, device type,
                and pages visited, via cookies and similar technologies; and (c) aggregated
                analytics data used to understand how the Site is used.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">2. Cookies &amp; analytics</h2>
              <p>
                We use cookies and third-party analytics tools to measure traffic and improve
                the Site. You can control or disable cookies through your browser settings.
                Disabling cookies may affect some site functionality.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">3. How we use your data</h2>
              <p>
                We use collected data to operate and improve the Site, send newsletters you
                have opted into, respond to inquiries, and measure the performance of content
                and affiliate partnerships. We do not sell your personal data to third parties.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">4. Legal basis &amp; your rights (GDPR)</h2>
              <p>
                If you are located in the EEA/UK, our legal basis for processing your data is
                typically consent (e.g. newsletter sign-up) or legitimate interest (e.g. site
                analytics). You have the right to access, correct, delete, or export your
                personal data, and to withdraw consent at any time by contacting us at{' '}
                <a href="mailto:hello@pipsnote.com" className="text-brand underline">
                  hello@pipsnote.com
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">5. Data retention &amp; security</h2>
              <p>
                We retain personal data only as long as necessary for the purposes described
                above and apply reasonable technical and organizational measures to protect it
                against unauthorized access, loss, or misuse.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">6. Third-party links</h2>
              <p>
                The Site links to third-party broker websites with their own privacy practices.
                We are not responsible for the privacy practices of external sites.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">7. Changes to this policy</h2>
              <p>
                We may update this Privacy Policy periodically. Material changes will be
                reflected by updating the &quot;Last updated&quot; date above.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">8. Contact</h2>
              <p>
                For privacy-related questions or requests, contact{' '}
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
