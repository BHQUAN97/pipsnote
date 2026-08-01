import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/#instruction', label: 'Instruction' },
  { href: '/brokers', label: 'Top Broker' },
  { href: '/#about', label: 'About Us' },
];

export default function Header({ siteName = 'PIPSNOTE' }: { siteName?: string }) {
  const brand = siteName.slice(0, 4).toUpperCase();
  const rest = siteName.slice(4).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-line bg-bg">
      <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between gap-4 px-7">
        <Link href="/" className="font-display text-[22px] tracking-tight">
          {brand}
          <span className="text-brand">{rest}</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative py-1.5 text-sm font-medium"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-brand transition-[width] duration-200 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/brokers"
            className="rounded-sm bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Compare Brokers
          </Link>
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
              Compare Brokers
            </Link>
            <div className="mt-1 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
