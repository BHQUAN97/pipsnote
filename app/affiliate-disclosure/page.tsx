// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | PIPSNOTE',
  description: 'How PIPSNOTE earns affiliate commissions from broker partners.',
};

export const dynamic = 'force-dynamic';

export default async function AffiliateDisclosurePage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-[28px] leading-tight md:text-[36px]">Affiliate Disclosure</h1>
          <p className="mb-9 text-[12.5px] text-gray-mid">Last updated: August 1, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>
              {siteName} is an independent content site. To keep the Site free to use, we
              participate in affiliate partnerships with some of the forex and crypto brokers
              featured in our articles, reviews, and comparison tables.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">How it works</h2>
              <p>
                When you click certain links to a broker&apos;s website and open an account or
                take a qualifying action, we may receive a commission from that broker. This
                comes at no additional cost to you and does not affect the price, terms, or
                conditions you receive from the broker.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Editorial independence</h2>
              <p>
                Affiliate relationships do not determine which brokers we cover or how we rate
                them. Our reviews and comparisons are based on our own research and publicly
                available information. However, because affiliate revenue supports the Site,
                you should be aware of this potential conflict of interest when reading broker
                content.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Not financial advice</h2>
              <p>
                Broker reviews and rankings are provided for informational purposes only and
                are not a recommendation or solicitation to open an account with any specific
                broker. Always do your own research before choosing a broker.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Questions</h2>
              <p>
                If you have questions about our affiliate relationships, contact us at{' '}
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
