'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import ProviderSettingsPanel from '@/components/admin/ProviderSettingsPanel';
import MarketChart from '@/components/admin/MarketChart';

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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  // Form thêm mã mới
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<'forex' | 'crypto' | 'commodity' | 'stock'>('forex');
  const [newDecimals, setNewDecimals] = useState('4');
  const [newYahooCode, setNewYahooCode] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/admin/market-data/refresh', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      const ok = data?.succeeded?.length ?? 0;
      const failed = data?.failed?.length ?? 0;
      setRefreshResult(`Đã đồng bộ: ${ok} symbol OK${failed ? `, ${failed} thất bại` : ''}`);
      load();
    } catch {
      setRefreshError('Đồng bộ thất bại. Thử lại.');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          category: newCategory,
          decimals: parseInt(newDecimals, 10) || 2,
          yahooCode: newYahooCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error ? JSON.stringify(data.error) : 'Thêm mã thất bại.';
        setAddError(err);
        return;
      }
      load();
      setShowAdd(false);
      setNewLabel('');
      setNewYahooCode('');
    } catch {
      setAddError('Thêm mã thất bại. Thử lại.');
    } finally {
      setAdding(false);
    }
  }

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
        <div className="flex flex-wrap items-center gap-3">
          {refreshError && <span className="text-sm text-down">{refreshError}</span>}
          {refreshResult && <span className="text-sm text-up">{refreshResult}</span>}
          <button
            onClick={() => {
              setShowAdd((v) => !v);
              setAddError(null);
            }}
            className="rounded-sm border border-brand px-3 py-2 text-sm font-medium text-brand"
          >
            {showAdd ? 'Huỷ' : '+ Thêm mã mới'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-sm bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {refreshing ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-6 grid gap-3 border border-gray-line p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-mid">Tên mã (VD: EUR/USD)</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="EUR/USD"
              className="min-h-[44px] w-full border border-gray-line bg-transparent px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-mid">Nhóm</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
              className="min-h-[44px] w-full border border-gray-line bg-transparent px-3 text-sm"
            >
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="commodity">Commodity</option>
              <option value="stock">Cổ phiếu</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-mid">Số chữ số thập phân</label>
            <input
              type="number"
              min={0}
              max={6}
              value={newDecimals}
              onChange={(e) => setNewDecimals(e.target.value)}
              className="min-h-[44px] w-full border border-gray-line bg-transparent px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-mid">Mã Yahoo (tuỳ chọn)</label>
            <input
              value={newYahooCode}
              onChange={(e) => setNewYahooCode(e.target.value)}
              placeholder="EURUSD=X"
              className="min-h-[44px] w-full border border-gray-line bg-transparent px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newLabel.trim()}
              className="min-h-[44px] rounded-sm bg-brand px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {adding ? 'Đang thêm…' : 'Thêm'}
            </button>
          </div>
          {addError && <p className="text-sm text-down sm:col-span-5">{addError}</p>}
        </div>
      )}

      <ProviderSettingsPanel />

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
                  <Fragment key={row.id}>
                  <tr className="border-b border-gray-line last:border-0 hover:bg-gray-bg">
                    <td className="p-3 font-medium">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        className="flex items-center gap-1 text-left hover:text-brand"
                        aria-expanded={expandedId === row.id}
                      >
                        {expandedId === row.id ? '▾' : '▸'}
                        <span>{row.label}</span>
                      </button>
                    </td>
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
                  {expandedId === row.id && (
                    <tr className="border-b border-gray-line bg-gray-bg/50 last:border-0">
                      <td colSpan={9} className="p-4">
                        <MarketChart symbolId={row.id} label={row.label} decimals={row.decimals} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
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
