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

const STATUS_OPTIONS = ['', 'active', 'inactive'];
const TYPE_OPTIONS = ['', 'forex', 'crypto', 'stock', 'all'];

export default function AdminBrokersPage() {
  const router = useRouter();
  const [items, setItems] = useState<BrokerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BrokerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set('status', status);
    if (type) params.set('type', type);

    fetch(`/api/admin/brokers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete broker "${name}"?`)) return;
    const res = await fetch(`/api/admin/brokers/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  async function handleReorder(id: number, direction: 'up' | 'down') {
    const res = await fetch(`/api/admin/brokers/${id}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
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
        <Link href="/admin/brokers/new" className="btn-primary">
          + New broker
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s || 'all-status'}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className="min-h-[40px] rounded-md px-4 text-sm font-medium transition-colors"
            style={{
              background: status === s ? 'var(--red)' : 'transparent',
              color: status === s ? '#fff' : 'var(--gray-mid)',
              border: status === s ? '1px solid var(--red)' : '1px solid var(--gray-line)',
            }}
          >
            {s || 'All statuses'}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((tOpt) => (
          <button
            key={tOpt || 'all-type'}
            onClick={() => {
              setType(tOpt);
              setPage(1);
            }}
            className={`min-h-[44px] rounded-sm border px-4 text-sm font-medium ${
              type === tOpt ? 'border-surface-dark bg-surface-dark text-white' : 'border-gray-line hover:bg-gray-bg'
            }`}
          >
            {tOpt || 'All types'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No brokers yet.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border sm:block" style={{ borderColor: 'var(--gray-line)' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Clicks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((broker) => (
                  <tr
                    key={broker.id}
                    onClick={() => handleRowClick(broker.id)}
                    onDoubleClick={() => handleRowDoubleClick(broker.id)}
                    className="cursor-pointer"
                  >
                    <td className="font-medium">
                      {broker.name}
                      {broker.badge && (
                        <span className="ml-2 rounded-sm bg-gray-bg px-2 py-0.5 text-xs font-normal">
                          {broker.badge}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--gray-mid)' }}>{broker.type}</td>
                    <td style={{ color: 'var(--gray-mid)' }}>{broker.rating ?? '—'}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-sm px-2 py-1 font-mono text-xs ${
                          broker.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                        }`}
                      >
                        {broker.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-mid)' }}>{broker.click_count}</td>
                    <td onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        {!status && (
                          <div className="flex flex-col">
                            <button
                              aria-label="Move up"
                              onClick={() => handleReorder(broker.id, 'up')}
                              className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                            >
                              ▲
                            </button>
                            <button
                              aria-label="Move down"
                              onClick={() => handleReorder(broker.id, 'down')}
                              className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                            >
                              ▼
                            </button>
                          </div>
                        )}
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

          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((broker) => (
              <div
                key={broker.id}
                onClick={() => openDetail(broker.id)}
                className="cursor-pointer border border-gray-line p-4 hover:bg-gray-bg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium leading-snug">
                    {broker.name}
                    {broker.badge && (
                      <span className="ml-2 rounded-sm bg-gray-bg px-2 py-0.5 text-xs font-normal">
                        {broker.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-1 font-mono text-xs ${
                      broker.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                    }`}
                  >
                    {broker.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-mid">
                  {broker.type} · rating {broker.rating ?? '—'} · {broker.click_count} clicks
                </div>
                <div
                  className="mt-3 flex items-center gap-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!status && (
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Move up"
                        onClick={() => handleReorder(broker.id, 'up')}
                        className="flex h-11 w-11 items-center justify-center hover:text-brand"
                      >
                        ▲
                      </button>
                      <button
                        aria-label="Move down"
                        onClick={() => handleReorder(broker.id, 'down')}
                        className="flex h-11 w-11 items-center justify-center hover:text-brand"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  <Link
                    href={`/admin/brokers/${broker.id}/edit`}
                    className="flex min-h-[44px] items-center text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(broker.id, broker.name)}
                    className="flex min-h-[44px] items-center text-down hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
