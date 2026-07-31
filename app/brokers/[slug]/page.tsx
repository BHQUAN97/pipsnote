import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import type { Broker } from '@/lib/types';
import Header from '@/components/Header';
import RiskDisclaimer from '@/components/RiskDisclaimer';
import Footer from '@/components/Footer';

async function getBroker(slug: string): Promise<Broker | null> {
  const rows = await query<Broker[]>(
    'SELECT * FROM brokers WHERE slug = ? AND is_active = 1 LIMIT 1',
    [slug]
  );
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const broker = await getBroker(slug);
  if (!broker) return {};

  return {
    title: `${broker.name} Review | PIPSNOTE`,
    description: broker.description || `Đánh giá chi tiết sàn ${broker.name}.`,
  };
}

export default async function BrokerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const broker = await getBroker(slug);
  if (!broker) notFound();

  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';

  const specs = [
    { label: 'Spread từ', value: broker.spread_from },
    { label: 'Đòn bẩy', value: broker.leverage },
    { label: 'Nạp tối thiểu', value: broker.min_deposit },
    { label: 'Loại', value: broker.type },
  ];

  return (
    <>
      <Header siteName={siteName} />

      <article className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[760px] px-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-tight md:text-[36px]">{broker.name}</h1>
              {broker.rating != null && (
                <span className="mt-1 block font-mono text-sm text-gray-mid">
                  ★ {Number(broker.rating).toFixed(1)} / 5
                </span>
              )}
            </div>
            {broker.badge && (
              <span
                className={`font-mono text-[10.5px] uppercase tracking-[0.06em] px-2 py-1 text-white ${
                  broker.badge === 'Hot' ? 'bg-brand' : 'bg-surface-dark'
                }`}
              >
                {broker.badge}
              </span>
            )}
          </div>

          {broker.description && (
            <p className="mb-9 leading-relaxed text-gray-mid">{broker.description}</p>
          )}

          <div className="mb-9 grid grid-cols-2 gap-4 border-t border-gray-line pt-6 text-[12.5px] text-gray-mid md:grid-cols-4">
            {specs.map((s) => (
              <div key={s.label}>
                {s.label}
                <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
                  {s.value ?? '—'}
                </b>
              </div>
            ))}
          </div>

          <a
            href={`/go/${broker.slug}`}
            target="_blank"
            rel="nofollow noopener"
            className="mb-9 inline-flex items-center justify-center rounded-sm bg-brand px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Mở tài khoản tại {broker.name} →
          </a>

          <div className="border-t border-gray-line pt-6">
            <RiskDisclaimer siteName={siteName} />
          </div>
        </div>
      </article>

      <Footer siteName={siteName} />
    </>
  );
}
