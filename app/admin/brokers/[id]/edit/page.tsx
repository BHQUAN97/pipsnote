'use client';

import { use, useEffect, useState } from 'react';
import BrokerForm from '@/components/admin/BrokerForm';
import type { Broker } from '@/lib/types';

export default function EditBrokerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/brokers/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Broker) => setBroker(data))
      .catch(() => setError('Không tìm thấy broker'));
  }, [id]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Sửa broker</h1>
      {error && <div className="p-3 bg-red text-white rounded text-sm">{error}</div>}
      {!error && !broker && <p className="text-sm text-gray-mid">Đang tải...</p>}
      {broker && <BrokerForm brokerId={broker.id} initialBroker={broker} />}
    </div>
  );
}
