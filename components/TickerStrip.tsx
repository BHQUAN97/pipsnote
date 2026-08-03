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
}: {
  show?: boolean;
  items?: MarketDataSnapshotItem[];
}) {
  if (!show || items.length === 0) return null;

  return (
    <div className="overflow-hidden whitespace-nowrap bg-surface-dark">
      <div className="animate-ticker-scroll inline-flex">
        <TickerItems items={items} />
        <TickerItems items={items} />
      </div>
    </div>
  );
}
