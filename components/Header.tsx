import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { getSiteSettings } from '@/lib/settings';
import ThemeToggle from './ThemeToggle';
import LocaleSwitcher from './LocaleSwitcher';

export default async function Header({ siteName = 'TopTrendMarkets' }: { siteName?: string }) {
  const t = await getTranslations('nav');
  const settings = await getSiteSettings();
  const logoImage = settings['seo.logo_image'] || '';
  const brand = siteName.slice(0, 4).toUpperCase();
  const rest = siteName.slice(4).toUpperCase();

  const NAV_LINKS = [
    { href: '/blog', label: t('blog') },
    { href: routes.instruction, label: t('instruction') },
    { href: '/brokers', label: t('topBroker') },
    { href: routes.about, label: t('aboutUs') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between gap-4 px-7">
        <Link href="/" className="group relative flex items-center font-display text-wordmark tracking-tight">
          {logoImage ? (
            <img src={logoImage} alt={siteName} className="h-8 w-auto max-w-[220px] object-contain" />
          ) : (
            <>
              {brand}
              <span className="text-gradient">{rest}</span>
            </>
          )}
          <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-brand transition-all duration-300 group-hover:w-full" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative py-1.5 text-sm font-medium text-gray-mid transition-colors hover:text-ink"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-brand transition-[width] duration-200 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/brokers"
            className="glow-brand rounded-lg bg-brand px-5 py-2.5 text-nav font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            {t('compareBrokers')}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <details className="relative md:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center text-2xl [&::-webkit-details-marker]:hidden">
            ☰
          </summary>
          <div className="absolute right-0 top-12 flex w-56 flex-col gap-1 border border-gray-line bg-bg p-3 shadow-lg">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-3 py-2.5 text-sm font-medium hover:bg-gray-bg"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/brokers"
              className="mt-1 rounded-sm bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              {t('compareBrokers')}
            </Link>
            <div className="mt-1 flex items-center justify-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
