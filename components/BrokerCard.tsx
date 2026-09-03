import Image from 'next/image';
import type { Broker } from '@/lib/types';

export default function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <a
      href={`/go/${broker.slug}`}
      target="_blank"
      rel="nofollow noopener"
      className="card-elevated group relative flex flex-col gap-4 border border-gray-line bg-bg p-6 hover:-translate-y-1.5 hover:border-ink/60 hover:shadow-soft"
    >
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-2.5">
          {broker.logo_url && (
            <Image
              src={broker.logo_url}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-sm object-contain"
            />
          )}
          <span className="font-display text-card-title">{broker.name}</span>
        </span>
        {broker.badge && (
          <span
            className="glow-brand font-mono text-badge uppercase tracking-[0.06em] px-2.5 py-1 text-white rounded-full"
            style={
              broker.badge === 'Hot'
                ? { background: 'linear-gradient(135deg, var(--red), var(--red-dark))' }
                : undefined
            }
          >
            {broker.badge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 border-t border-gray-line pt-4 text-meta text-gray-mid">
        <div>
          Spread from
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.spread_from ?? '—'}
          </b>
        </div>
        <div>
          Leverage
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.leverage ?? '—'}
          </b>
        </div>
        <div>
          Min deposit
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.min_deposit ?? '—'}
          </b>
        </div>
        <div>
          Regulation
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">Multi-jurisdiction</b>
        </div>
      </div>

      <span className="mt-auto flex items-center justify-between gap-2 overflow-hidden rounded-lg bg-brand px-4 py-3.5 text-nav font-semibold text-white transition-all duration-200 group-hover:bg-brand-dark">
        <span>Open account</span>
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span>
      </span>
    </a>
  );
}
