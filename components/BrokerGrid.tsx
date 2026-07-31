import { query } from '@/lib/db';
import type { Broker } from '@/lib/types';
import BrokerCard from './BrokerCard';

export default async function BrokerGrid({ limit = 6 }: { limit?: number }) {
  const brokers = await query<Broker[]>(
    'SELECT * FROM brokers WHERE is_active = 1 ORDER BY is_featured DESC, rating DESC LIMIT ?',
    [limit]
  );

  if (brokers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {brokers.map((broker) => (
        <BrokerCard key={broker.id} broker={broker} />
      ))}
    </div>
  );
}
