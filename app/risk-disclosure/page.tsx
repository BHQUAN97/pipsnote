// Boilerplate content — pending legal review before production use.
import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Risk Disclosure | PIPSNOTE',
  description: 'Risk warning for forex and CFD trading content on PIPSNOTE.',
};

export const dynamic = 'force-dynamic';

export default async function RiskDisclosurePage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="mb-2 text-[28px] leading-tight md:text-[36px]">Risk Disclosure</h1>
          <p className="mb-9 text-[12.5px] text-gray-mid">Last updated: August 1, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-mid">
            <p>
              <strong className="text-ink">Risk warning:</strong> Leveraged forex and CFD
              trading carries a high risk of capital loss and may not be suitable for all
              investors. You could lose more than your initial deposit. Before trading, you
              should carefully consider your investment objectives, level of experience, and
              risk appetite, and seek independent financial advice if necessary.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Leverage risk</h2>
              <p>
                Leverage can amplify both gains and losses. Small market movements can result
                in losses that exceed your initial investment when trading on margin.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Market volatility</h2>
              <p>
                Forex and crypto markets can be highly volatile. Prices can move rapidly
                against your position due to economic events, news, or low liquidity, and past
                performance is not indicative of future results.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Not investment advice</h2>
              <p>
                Content on {siteName} — including articles, market commentary, and broker
                comparisons — is for informational purposes only and does not constitute
                investment advice or a recommendation to buy, sell, or hold any financial
                instrument. {siteName} may receive affiliate commissions from some of the
                brokers listed on this site — see our{' '}
                <a href="/affiliate-disclosure" className="text-brand underline">
                  Affiliate Disclosure
                </a>{' '}
                for details.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink">Seek independent advice</h2>
              <p>
                Only trade with money you can afford to lose. If you are unsure about the risks
                involved, consult a licensed financial advisor before making any trading
                decision.
              </p>
            </div>
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
