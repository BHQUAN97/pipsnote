import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { getSiteSettings } from '@/lib/settings';
import RiskDisclaimer from './RiskDisclaimer';

export default async function Footer({ siteName = 'TopTrendMarkets' }: { siteName?: string }) {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const settings = await getSiteSettings();
  const brand = siteName.slice(0, 4).toUpperCase();
  const rest = siteName.slice(4).toUpperCase();
  const contactEmail = settings['footer.contact_email'] || 'hello@toptrendmarkets.com';

  return (
    <footer className="border-t border-gray-line bg-bg pt-16">
      <div className="mx-auto max-w-[1180px] px-7">
        <div className="grid grid-cols-1 gap-10 pb-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10">
          <div>
            <div className="mb-3.5 font-display text-wordmark">
              {brand}
              <span className="text-brand">{rest}</span>
            </div>
            <p className="mb-5 max-w-[280px] text-sm leading-relaxed text-gray-mid">
              {t('tagline')}
            </p>
            <div className="flex gap-3">
              {['FB', 'TG', 'YT', 'X'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-gray-line font-mono text-nav text-gray-mid transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-meta uppercase tracking-[0.08em] text-gray-mid">
              {t('navigation')}
            </h4>
            <Link href={routes.blog} className="mb-3 block text-sm hover:text-brand">
              {tNav('blog')}
            </Link>
            <Link href={routes.instruction} className="mb-3 block text-sm hover:text-brand">
              {tNav('instruction')}
            </Link>
            <Link href={routes.brokers} className="mb-3 block text-sm hover:text-brand">
              {tNav('topBroker')}
            </Link>
            <Link href={routes.about} className="mb-3 block text-sm hover:text-brand">
              {tNav('aboutUs')}
            </Link>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-meta uppercase tracking-[0.08em] text-gray-mid">
              {t('policies')}
            </h4>
            <Link href={routes.privacyPolicy} className="mb-3 block text-sm hover:text-brand">
              {t('privacyPolicy')}
            </Link>
            <Link href={routes.terms} className="mb-3 block text-sm hover:text-brand">
              {t('termsConditions')}
            </Link>
            <Link href={routes.riskDisclosure} className="mb-3 block text-sm hover:text-brand">
              {t('riskDisclosure')}
            </Link>
            <Link href={routes.affiliateDisclosure} className="mb-3 block text-sm hover:text-brand">
              {t('affiliateDisclosure')}
            </Link>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-meta uppercase tracking-[0.08em] text-gray-mid">
              {t('contact')}
            </h4>
            <a href={`mailto:${contactEmail}`} className="mb-3 block text-sm hover:text-brand">
              {contactEmail}
            </a>
            <Link href={routes.contact} className="mb-3 block text-sm hover:text-brand">
              {t('sendFeedback')}
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-line py-5">
          <RiskDisclaimer siteName={siteName} />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-line py-5 text-meta text-gray-mid sm:flex-row sm:items-center sm:justify-between">
          <span>{t('copyright', { siteName })}</span>
          <div className="flex gap-5">
            <Link href={routes.privacyPolicy} className="hover:text-brand">
              {t('privacy')}
            </Link>
            <Link href={routes.terms} className="hover:text-brand">
              {t('terms')}
            </Link>
            <a href="/sitemap.xml" className="hover:text-brand">
              {t('sitemap')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
