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
    <section className="relative overflow-hidden border-b border-gray-line">
      {/* Nền gradient tài chính mặc định (luôn có, kể cả không đặt bg.hero) */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 85% 12%, rgba(243,183,40,0.14) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 5% 92%, rgba(46,139,255,0.10) 0%, transparent 55%),' +
            'linear-gradient(165deg, var(--surface-dark) 0%, var(--bg) 100%)',
        }}
      />
      {bgUrl && (
        <>
          <Image src={bgUrl} alt="" fill priority className="absolute inset-0 -z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-surface-dark/90 via-surface-dark/55 to-surface-dark/30" />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-[1440px] px-7 pb-24 pt-28 md:pb-40 md:pt-36">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-14 md:grid md:grid-cols-[1.2fr_0.8fr] md:items-start md:gap-16">
          {/* Editorial headline — kinetic mask reveal, giant clamp display */}
          <div>
            <span className="c-eyebrow">{t('eyebrow')}</span>
            <h1 className="mt-6">
              <span className="k-mask block"><span className="k-line h-display">{t('headlineLine1')}</span></span>
              <span className="k-mask block"><span className="k-line h-display text-gradient">{t('headlineLine2')}</span></span>
            </h1>
            <p className="mt-8 max-w-[560px] text-body-lg leading-relaxed text-gray-mid" data-fade>
              {t('subtitle')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4" data-fade>
              <Link
                href="/blog"
                className="glow-brand rounded-full border border-brand bg-brand px-8 py-4 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                {t('readLatest')}
              </Link>
              <Link
                href="/brokers"
                className="group rounded-full border border-ink/25 px-8 py-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:bg-surface-dark hover:text-white"
              >
                {t('viewTopBrokers')} <span className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>

          {/* Frosted live-market panel */}
          <div className="card-glow p-6" data-fade>
            <div className="flex items-center justify-between border-b border-gray-line pb-3">
              <span className="c-eyebrow">Live markets</span>
              <span className="flex h-2 w-2 items-center justify-center rounded-full bg-up">
                <span className="h-1.5 w-1.5 rounded-full bg-up" />
              </span>
            </div>
            {HERO_STATS.map(([pair, value, direction]) => (
              <div
                key={pair}
                className="flex justify-between border-b border-gray-line/70 py-3 text-sm last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="font-medium">{pair}</span>
                <span className={`font-mono font-semibold ${direction === 'up' ? 'text-up' : 'text-down'}`}>
                  {value} {direction === 'up' ? '▲' : '▼'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}