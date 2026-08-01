import Link from 'next/link';
import { routes } from '@/lib/routes';
import RiskDisclaimer from './RiskDisclaimer';

export default function Footer({ siteName = 'PIPSNOTE' }: { siteName?: string }) {
  const brand = siteName.slice(0, 4).toUpperCase();
  const rest = siteName.slice(4).toUpperCase();

  return (
    <footer id="about" className="border-t border-gray-line bg-bg pt-16">
      <div className="mx-auto max-w-[1180px] px-7">
        <div className="grid grid-cols-1 gap-10 pb-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10">
          <div>
            <div className="mb-3.5 font-display text-[22px]">
              {brand}
              <span className="text-brand">{rest}</span>
            </div>
            <p className="mb-5 max-w-[280px] text-sm leading-relaxed text-gray-mid">
              An independent forex blog — providing market analysis, trading guides, and broker
              reviews to help traders make smarter decisions.
            </p>
            <div className="flex gap-3">
              {['FB', 'TG', 'YT', 'X'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-[34px] w-[34px] items-center justify-center border border-gray-line font-mono text-[13px] transition-colors hover:bg-surface-dark hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[12.5px] uppercase tracking-[0.08em] text-gray-mid">
              Navigation
            </h4>
            <Link href={routes.blog} className="mb-3 block text-sm hover:text-brand">
              Blog
            </Link>
            <Link href="/#instruction" className="mb-3 block text-sm hover:text-brand">
              Instruction
            </Link>
            <Link href={routes.brokers} className="mb-3 block text-sm hover:text-brand">
              Top Broker
            </Link>
            <Link href="/#about" className="mb-3 block text-sm hover:text-brand">
              About Us
            </Link>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[12.5px] uppercase tracking-[0.08em] text-gray-mid">
              Policies
            </h4>
            <Link href={routes.privacyPolicy} className="mb-3 block text-sm hover:text-brand">
              Privacy Policy
            </Link>
            <Link href={routes.terms} className="mb-3 block text-sm hover:text-brand">
              Terms &amp; Conditions
            </Link>
            <Link href={routes.riskDisclosure} className="mb-3 block text-sm hover:text-brand">
              Risk Disclosure
            </Link>
            <Link href={routes.affiliateDisclosure} className="mb-3 block text-sm hover:text-brand">
              Affiliate Disclosure
            </Link>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[12.5px] uppercase tracking-[0.08em] text-gray-mid">
              Contact
            </h4>
            <a href="mailto:hello@pipsnote.com" className="mb-3 block text-sm hover:text-brand">
              hello@pipsnote.com
            </a>
            <Link href={routes.contact} className="mb-3 block text-sm hover:text-brand">
              Send feedback
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-line py-5">
          <RiskDisclaimer siteName={siteName} />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-line py-5 text-[12.5px] text-gray-mid sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 {siteName}. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href={routes.privacyPolicy} className="hover:text-brand">
              Privacy
            </Link>
            <Link href={routes.terms} className="hover:text-brand">
              Terms
            </Link>
            <Link href="/sitemap.xml" className="hover:text-brand">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
