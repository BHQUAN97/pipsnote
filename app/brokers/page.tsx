import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import type { Broker } from '@/lib/types';
import Header from '@/components/Header';
import BrokerCard from '@/components/BrokerCard';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'So sánh Broker | PIPSNOTE',
  description: 'Bảng so sánh đầy đủ các sàn forex/crypto được đánh giá.',
};

export default async function BrokersPage() {
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'PIPSNOTE';
  const brokers = await query<Broker[]>(
    'SELECT * FROM brokers WHERE is_active = 1 ORDER BY is_featured DESC, rating DESC'
  );

  return (
    <>
      <Header siteName={siteName} />

      <section className="py-16 md:py-[72px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
            Đối tác giao dịch
          </span>
          <h1 className="mt-1 mb-9 text-[26px] md:text-[30px]">Tất cả Broker</h1>

          {brokers.length === 0 ? (
            <p className="text-sm text-gray-mid">Chưa có broker nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {brokers.map((broker) => (
                <BrokerCard key={broker.id} broker={broker} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer siteName={siteName} />
    </>
  );
}
