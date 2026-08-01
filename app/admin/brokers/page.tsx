'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DetailDrawer, { type DetailField } from '@/components/admin/DetailDrawer';

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

interface BrokerDetail extends BrokerRow {
  logo_url: string | null;
  description: string | null;
  min_deposit: string | null;
  leverage: string | null;
  spread_from: string | null;
  affiliate_url: string | null;
}

export default function AdminBrokersPage() {
  const router = useRouter();
  const [items, setItems] = useState<BrokerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BrokerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!window.confirm(`Delete broker "${name}"?`)) return;
    const res = await fetch(`/api/admin/brokers/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  function openDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/admin/brokers/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: BrokerDetail) => setDetail(data))
      .finally(() => setDetailLoading(false));
  }

  function handleRowClick(id: number) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      openDetail(id);
      clickTimer.current = null;
    }, 220);
  }

  function handleRowDoubleClick(id: number) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    router.push(`/admin/brokers/${id}/edit`);
  }

  const detailFields: DetailField[] = detail
    ? [
        { label: 'Name', value: detail.name },
        { label: 'Slug', value: detail.slug },
        { label: 'Type', value: detail.type },
        { label: 'Badge', value: detail.badge ?? '—' },
        { label: 'Rating', value: detail.rating ?? '—' },
        { label: 'Min deposit', value: detail.min_deposit ?? '—' },
        { label: 'Leverage', value: detail.leverage ?? '—' },
        { label: 'Spread from', value: detail.spread_from ?? '—' },
        { label: 'Affiliate URL', value: detail.affiliate_url ?? '—' },
        { label: 'Description', value: detail.description ?? '—' },
        { label: 'Status', value: detail.is_active ? 'active' : 'inactive' },
        { label: 'Clicks', value: detail.click_count },
      ]
    : [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Brokers</h1>
        <Link
          href="/admin/brokers/new"
          className="min-h-[44px] rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark flex items-center"
        >
          + New broker
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No brokers yet.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-line bg-gray-bg text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Status</th>
                <th className="p-3">Clicks</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((broker) => (
                <tr
                  key={broker.id}
                  onClick={() => handleRowClick(broker.id)}
                  onDoubleClick={() => handleRowDoubleClick(broker.id)}
                  className="cursor-pointer border-b border-gray-line last:border-0 hover:bg-gray-bg"
                >
                  <td className="p-3 font-medium">
                    {broker.name}
                    {broker.badge && (
                      <span className="ml-2 rounded-sm bg-gray-bg px-2 py-0.5 text-xs font-normal">
                        {broker.badge}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-gray-mid">{broker.type}</td>
                  <td className="p-3 text-gray-mid">{broker.rating ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-sm px-2 py-1 font-mono text-xs ${
                        broker.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                      }`}
                    >
                      {broker.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-mid">{broker.click_count}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3">
                      <Link href={`/admin/brokers/${broker.id}/edit`} className="text-brand hover:underline">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(broker.id, broker.name)}
                        className="text-down hover:underline"
                      >
                        Delete
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

      <DetailDrawer
        open={detailId !== null}
        title="Broker detail"
        loading={detailLoading}
        fields={detailFields}
        editHref={detailId ? `/admin/brokers/${detailId}/edit` : undefined}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
