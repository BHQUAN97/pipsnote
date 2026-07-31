import Link from 'next/link';

const HERO_STATS: Array<[pair: string, value: string, direction: 'up' | 'down']> = [
  ['EUR/USD', '1.0842', 'up'],
  ['GBP/USD', '1.2671', 'down'],
  ['USD/JPY', '155.32', 'up'],
  ['XAU/USD', '2,438.10', 'up'],
  ['BTC/USD', '64,215', 'down'],
];

export default function Hero() {
  return (
    <section className="border-b border-gray-line py-16 md:py-[88px]">
      <div className="mx-auto grid max-w-[1180px] gap-12 px-7 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
        <div>
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
            Market intelligence, without the noise
          </span>
          <h1 className="mt-3 mb-5 text-[38px] md:text-[58px]">
            Read the market.
            <br />
            Trade with clarity.
          </h1>
          <p className="mb-7 max-w-[460px] text-[17px] leading-relaxed text-gray-mid">
            Phân tích forex, chiến lược giao dịch và đánh giá sàn khách quan — giúp bạn ra quyết
            định dựa trên dữ liệu, không phải cảm tính.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/blog"
              className="rounded-sm border border-brand bg-brand px-6 py-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Đọc bài mới nhất
            </Link>
            <Link
              href="/brokers"
              className="rounded-sm border border-ink px-6 py-4 text-sm font-semibold hover:bg-surface-dark hover:text-white"
            >
              Xem Top Broker
            </Link>
          </div>
        </div>

        <div className="border border-gray-line bg-gray-bg p-6">
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
