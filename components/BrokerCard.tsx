import type { Broker } from '@/lib/types';

export default function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <a
      href={`/go/${broker.slug}`}
      target="_blank"
      rel="nofollow noopener"
      className="card-elevated group flex flex-col gap-4 border border-gray-line bg-bg p-6 hover:-translate-y-1 hover:border-ink"
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-card-title">{broker.name}</span>
        {broker.badge && (
          <span
            className={`font-mono text-badge uppercase tracking-[0.06em] px-2 py-1 text-white ${
              broker.badge === 'Hot' ? 'bg-brand' : 'bg-surface-dark'
            }`}
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

      <span className="mt-auto flex items-center justify-between rounded-sm bg-brand px-4 py-3.5 text-nav font-semibold text-white transition-colors group-hover:bg-brand-dark">
        Open account <span aria-hidden>→</span>
      </span>
    </a>
  );
}
