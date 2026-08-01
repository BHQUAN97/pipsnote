const TICKER_DATA: Array<[pair: string, value: string, direction: 'up' | 'down']> = [
  ['EUR/USD', '1.0842', 'up'],
  ['GBP/USD', '1.2671', 'down'],
  ['USD/JPY', '155.32', 'up'],
  ['XAU/USD', '2,438.10', 'up'],
  ['USD/CHF', '0.9012', 'down'],
  ['AUD/USD', '0.6614', 'up'],
  ['BTC/USD', '64,215', 'down'],
  ['USD/CAD', '1.3720', 'up'],
  ['NZD/USD', '0.6023', 'down'],
  ['XAG/USD', '29.14', 'up'],
];

function TickerItems() {
  return (
    <>
      {TICKER_DATA.map(([pair, value, direction], i) => (
        <span
          key={`${pair}-${i}`}
          className="inline-flex items-center gap-2 whitespace-nowrap border-r border-white/10 px-7 py-2.5 font-mono text-meta text-white"
        >
          <span className="font-medium">{pair}</span>
          <span className={direction === 'up' ? 'text-up' : 'text-down'}>
            {value} {direction === 'up' ? '▲' : '▼'}
          </span>
        </span>
      ))}
    </>
  );
}

export default function TickerStrip({ show = true }: { show?: boolean }) {
  if (!show) return null;

  return (
    <div className="overflow-hidden whitespace-nowrap bg-surface-dark">
      <div className="animate-ticker-scroll inline-flex">
        <TickerItems />
        <TickerItems />
      </div>
    </div>
  );
}
