'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface BrokerRow {
  id: number;
  name: string;
  slug: string;
  type: 'forex' | 'crypto' | 'stock' | 'all';
  badge: string | null;
  rating: number | null;
  is_active: number;
  is_featured: number;
  click_count: number;
  updated_at: string;
}

export default function AdminBrokersPage() {
  const [items, setItems] = useState<BrokerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

    fetch(`/api/admin/brokers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Xoá broker "${name}"?`)) return;
    const res = await fetch(`/api/admin/brokers/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Brokers</h1>
        <Link
          href="/admin/brokers/new"
          className="min-h-[44px] rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark flex items-center"
        >
          + Broker mới
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">Chưa có broker nào.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-line bg-gray-bg text-left">
                <th className="p-3">Tên</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Đánh giá</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Clicks</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((broker) => (
                <tr key={broker.id} className="border-b border-gray-line last:border-0">
                  <td className="p-3 font-medium">
                    {broker.name}
                    {broker.badge && (
                      <span className="ml-2 rounded bg-gray-bg px-2 py-0.5 text-xs font-normal">
                        {broker.badge}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-gray-mid">{broker.type}</td>
                  <td className="p-3 text-gray-mid">{broker.rating ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-1 font-mono text-xs ${
                        broker.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                      }`}
                    >
                      {broker.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-mid">{broker.click_count}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/brokers/${broker.id}/edit`} className="text-brand hover:underline">
                        Sửa
                      </Link>
                      <button
                        onClick={() => handleDelete(broker.id, broker.name)}
                        className="text-down hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-11 min-w-11 items-center justify-center border px-3 text-sm ${
                p === page ? 'border-surface-dark bg-surface-dark text-white' : 'border-gray-line'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
