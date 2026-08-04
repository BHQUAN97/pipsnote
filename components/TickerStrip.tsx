import Image from 'next/image';
import type { MarketDataSnapshotItem } from '@/lib/marketData/getSnapshot';

function TickerItems({ items }: { items: MarketDataSnapshotItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <span
          key={`${item.label}-${i}`}
          className="inline-flex items-center gap-2 whitespace-nowrap border-r border-white/10 px-7 py-2.5 font-mono text-meta text-white"
        >
          <span className="font-medium">{item.label}</span>
          <span
            className={
              item.direction === 'up' ? 'text-up' : item.direction === 'down' ? 'text-down' : 'text-white/70'
            }
          >
            {item.price.toFixed(item.decimals)}{' '}
            {item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : '–'}
          </span>
        </span>
      ))}
    </>
  );
}

export default function TickerStrip({
  show = true,
  items = [],
  bgUrl,
}: {
  show?: boolean;
  items?: MarketDataSnapshotItem[];
  bgUrl?: string;
}) {
  if (!show || items.length === 0) return null;

  return (
    <div className="relative overflow-hidden whitespace-nowrap bg-surface-dark">
      {bgUrl && (
        <>
          <Image src={bgUrl} alt="" fill className="absolute inset-0 -z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-surface-dark/70" />
        </>
      )}
      <div className="animate-ticker-scroll relative z-10 inline-flex">
        <TickerItems items={items} />
        <TickerItems items={items} />
      </div>
    </div>
  );
}
