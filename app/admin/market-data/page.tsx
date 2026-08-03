'use client';

import { useEffect, useState, useCallback } from 'react';

interface MarketDataRow {
  id: number;
  label: string;
  category: 'forex' | 'crypto' | 'commodity' | 'stock';
  decimals: number;
  is_active: number;
  sort_order: number;
  updated_at: string;
  price: string | null;
  change_percent: string | null;
  direction: 'up' | 'down' | 'flat' | null;
  source: string | null;
  fetched_at: string | null;
}

const STALE_MS = 30 * 60 * 1000;

function formatPrice(price: string | null, decimals: number): string {
  if (price === null) return '—';
  return Number(price).toFixed(decimals);
}

function formatChangePercent(changePercent: string | null): string {
  if (changePercent === null) return '—';
  const value = Number(changePercent);
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

function isStale(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > STALE_MS;
}

function directionLabel(direction: MarketDataRow['direction']): string {
  if (direction === 'up') return '▲';
  if (direction === 'down') return '▼';
  return '–';
}

function directionClass(direction: MarketDataRow['direction']): string {
  if (direction === 'up') return 'text-up';
  if (direction === 'down') return 'text-down';
  return 'text-gray-mid';
}

export default function AdminMarketDataPage() {
  const [items, setItems] = useState<MarketDataRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/admin/market-data')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(row: MarketDataRow) {
    const nextActive = row.is_active ? false : true;
    setItems((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, is_active: nextActive ? 1 : 0 } : item))
    );
    const res = await fetch(`/api/admin/market-data/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: nextActive }),
    });
    if (!res.ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, is_active: row.is_active } : item))
      );
    }
  }

  async function handleReorder(id: number, direction: 'up' | 'down') {
    const res = await fetch(`/api/admin/market-data/${id}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Market Data</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No symbols configured.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto border border-gray-line sm:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-line bg-gray-bg text-left">
                  <th className="p-3">Label</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Change %</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Fetched</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-line last:border-0 hover:bg-gray-bg">
                    <td className="p-3 font-medium">{row.label}</td>
                    <td className="p-3 text-gray-mid">{row.category}</td>
                    <td className="p-3">{formatPrice(row.price, row.decimals)}</td>
                    <td className="p-3">{formatChangePercent(row.change_percent)}</td>
                    <td className={`p-3 ${directionClass(row.direction)}`}>{directionLabel(row.direction)}</td>
                    <td className="p-3 text-gray-mid">{row.source ?? '—'}</td>
                    <td className="p-3 text-gray-mid">
                      {formatRelativeTime(row.fetched_at)}
                      {isStale(row.fetched_at) && (
                        <span className="ml-2 rounded-sm bg-down px-2 py-0.5 text-xs font-medium text-white">
                          stale
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggle(row)}
                        className={`rounded-sm px-2 py-1 font-mono text-xs ${
                          row.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                        }`}
                      >
                        {row.is_active ? 'active' : 'inactive'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <button
                          aria-label="Move up"
                          onClick={() => handleReorder(row.id, 'up')}
                          className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                        >
                          ▲
                        </button>
                        <button
                          aria-label="Move down"
                          onClick={() => handleReorder(row.id, 'down')}
                          className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((row) => (
              <div key={row.id} className="border border-gray-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium leading-snug">{row.label}</span>
                  <button
                    onClick={() => handleToggle(row)}
                    className={`shrink-0 rounded-sm px-2 py-1 font-mono text-xs ${
                      row.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                    }`}
                  >
                    {row.is_active ? 'active' : 'inactive'}
                  </button>
                </div>
                <div className="mt-1 text-sm text-gray-mid">
                  {row.category} · {formatPrice(row.price, row.decimals)}{' '}
                  <span className={directionClass(row.direction)}>
                    {directionLabel(row.direction)} {formatChangePercent(row.change_percent)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-mid">
                  {row.source ?? '—'} · {formatRelativeTime(row.fetched_at)}
                  {isStale(row.fetched_at) && (
                    <span className="ml-2 rounded-sm bg-down px-2 py-0.5 text-xs font-medium text-white">
                      stale
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <button
                    aria-label="Move up"
                    onClick={() => handleReorder(row.id, 'up')}
                    className="flex h-11 w-11 items-center justify-center hover:text-brand"
                  >
                    ▲
                  </button>
                  <button
                    aria-label="Move down"
                    onClick={() => handleReorder(row.id, 'down')}
                    className="flex h-11 w-11 items-center justify-center hover:text-brand"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
