import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const HERO_STATS: Array<[pair: string, value: string, direction: 'up' | 'down']> = [
  ['EUR/USD', '1.0842', 'up'],
  ['GBP/USD', '1.2671', 'down'],
  ['USD/JPY', '155.32', 'up'],
  ['XAU/USD', '2,438.10', 'up'],
  ['BTC/USD', '64,215', 'down'],
];

export default function Hero({ bgUrl }: { bgUrl?: string }) {
  const t = useTranslations('hero');

  return (
    <section
      className="relative overflow-hidden border-b py-16 md:py-[88px]"
      style={{ borderColor: 'var(--gray-line)' }}
    >
      {/* Nền gradient tài chính mặc định (luôn có, kể cả không đặt bg.hero) */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 85% 20%, rgba(46,139,255,0.18) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 5% 90%, rgba(46,139,255,0.10) 0%, transparent 55%),' +
            'linear-gradient(160deg, var(--surface-dark) 0%, var(--bg) 100%)',
        }}
      />
      {bgUrl && (
        <>
          <Image src={bgUrl} alt="" fill priority className="absolute inset-0 -z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-surface-dark/90 via-surface-dark/55 to-surface-dark/30" />
        </>
      )}
      <div className="relative z-10 mx-auto grid max-w-[1180px] gap-12 px-7 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
        <div>
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
            {t('eyebrow')}
          </span>
          <h1 className="mt-3 mb-5 text-display md:text-display-lg">
            {t('headlineLine1')}
            <br />
            {t('headlineLine2')}
          </h1>
          <p className="mb-7 max-w-[460px] text-body-lg leading-relaxed text-gray-mid">
            {t('subtitle')}
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/blog"
              className="rounded-sm border border-brand bg-brand px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              {t('readLatest')}
            </Link>
            <Link
              href="/brokers"
              className="rounded-sm border border-ink px-6 py-4 text-sm font-semibold transition-colors hover:bg-surface-dark hover:text-white"
            >
              {t('viewTopBrokers')}
            </Link>
          </div>
        </div>

        <div className="shadow-elevated-static border border-gray-line bg-gray-bg p-6">
          {HERO_STATS.map(([pair, value, direction]) => (
            <div
              key={pair}
              className="flex justify-between border-b border-gray-line py-3 text-sm last:border-b-0"
            >
              <span>{pair}</span>
              <span
                className={`font-mono font-medium ${direction === 'up' ? 'text-up' : 'text-down'}`}
              >
                {value} {direction === 'up' ? '▲' : '▼'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
