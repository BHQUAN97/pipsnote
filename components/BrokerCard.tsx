import type { Broker } from '@/lib/types';

export default function BrokerCard({ broker }: { broker: Broker }) {
  return (
    <div className="group flex flex-col gap-4 border border-gray-line bg-bg p-6 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-ink">
      <div className="flex items-start justify-between">
        <span className="font-display text-[19px]">{broker.name}</span>
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

      <div className="grid grid-cols-2 gap-2.5 border-t border-gray-line pt-4 text-[12.5px] text-gray-mid">
        <div>
          Spread từ
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.spread_from ?? '—'}
          </b>
        </div>
        <div>
          Đòn bẩy
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.leverage ?? '—'}
          </b>
        </div>
        <div>
          Nạp tối thiểu
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">
            {broker.min_deposit ?? '—'}
          </b>
        </div>
        <div>
          Quy định
          <b className="mt-0.5 block font-mono text-sm font-medium text-ink">Đa quốc gia</b>
        </div>
      </div>

      <a
        href={`/go/${broker.slug}`}
        target="_blank"
        rel="nofollow noopener"
        className="mt-auto flex items-center justify-between rounded-sm bg-brand px-4 py-3.5 text-[13.5px] font-semibold text-white hover:bg-brand-dark"
      >
        Mở tài khoản <span>→</span>
      </a>
    </div>
  );
}
