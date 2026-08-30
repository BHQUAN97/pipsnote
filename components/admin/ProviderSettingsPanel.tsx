'use client';

import { useEffect, useState, useCallback } from 'react';

interface ProviderConfigRow {
  provider_key: string;
  category: 'forex' | 'crypto' | 'commodity' | 'stock';
  is_enabled: boolean;
  requires_key: boolean;
  has_api_key: boolean;
  has_api_secret: boolean;
  updated_at: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  twelvedata: 'Twelve Data',
  fcs: 'FCS API',
  alpaca: 'Alpaca',
  coingecko: 'CoinGecko',
  goldapi: 'Gold-API',
  yahoo: 'Yahoo Finance',
};

// Provider free (không cần API key) — tô xanh để dễ nhận diện.
const FREE_PROVIDERS = new Set(['coingecko', 'goldapi', 'yahoo']);

const CATEGORY_ORDER = ['forex', 'crypto', 'commodity', 'stock'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  forex: 'Forex',
  crypto: 'Crypto',
  commodity: 'Commodity',
  stock: 'Stocks',
};

interface KeyInputState {
  apiKey: string;
  apiSecret: string;
  saving: boolean;
  error: string | null;
}

export default function ProviderSettingsPanel() {
  const [items, setItems] = useState<ProviderConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyInputs, setKeyInputs] = useState<Record<string, KeyInputState>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/market-data/providers')
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

  function getKeyInput(providerKey: string): KeyInputState {
    return keyInputs[providerKey] ?? { apiKey: '', apiSecret: '', saving: false, error: null };
  }

  function setKeyInput(providerKey: string, patch: Partial<KeyInputState>) {
    setKeyInputs((prev) => ({ ...prev, [providerKey]: { ...getKeyInput(providerKey), ...patch } }));
  }

  function showSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function handleToggle(row: ProviderConfigRow) {
    const nextEnabled = !row.is_enabled;
    setItems((prev) =>
      prev.map((item) => (item.provider_key === row.provider_key ? { ...item, is_enabled: nextEnabled } : item))
    );
    try {
      const res = await fetch(`/api/admin/market-data/providers/${row.provider_key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: nextEnabled }),
      });
      if (!res.ok) throw new Error();
      showSaved(`${PROVIDER_LABELS[row.provider_key] ?? row.provider_key} ${nextEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      setItems((prev) =>
        prev.map((item) => (item.provider_key === row.provider_key ? { ...item, is_enabled: row.is_enabled } : item))
      );
    }
  }

  async function handleSaveKey(row: ProviderConfigRow) {
    const input = getKeyInput(row.provider_key);
    const body: Record<string, string> = {};
    if (input.apiKey.trim()) body.apiKey = input.apiKey.trim();
    if (row.provider_key === 'alpaca' && input.apiSecret.trim()) body.apiSecret = input.apiSecret.trim();
    if (Object.keys(body).length === 0) return;

    setKeyInput(row.provider_key, { saving: true, error: null });
    try {
      const res = await fetch(`/api/admin/market-data/providers/${row.provider_key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems((prev) => prev.map((item) => (item.provider_key === row.provider_key ? data.item : item)));
      setKeyInput(row.provider_key, { apiKey: '', apiSecret: '', saving: false, error: null });
      showSaved(`${PROVIDER_LABELS[row.provider_key] ?? row.provider_key} key saved`);
    } catch {
      setKeyInput(row.provider_key, { saving: false, error: 'Save failed. Try again.' });
    }
  }

  // Nhóm provider theo category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: items.filter((i) => i.category === cat),
  })).filter((g) => g.rows.length > 0);

  return (
    <section className="mb-8 border border-gray-line p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Data Providers</h2>
          <p className="text-sm text-gray-mid">
            Nguồn dữ liệu cho ticker. Provider miễn phí ({Array.from(FREE_PROVIDERS).map((p) => PROVIDER_LABELS[p]).join(', ')}) không cần API key.
          </p>
        </div>
        {savedMsg && <span className="rounded-sm bg-up/10 px-3 py-1 text-sm font-medium text-up">{savedMsg}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : (
        grouped.map(({ cat, rows }) => (
          <div key={cat} className="mb-5">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-gray-mid">{CATEGORY_LABELS[cat]}</h3>
            <div className="flex flex-col gap-3">
              {rows.map((row) => {
                const input = getKeyInput(row.provider_key);
                const isFree = FREE_PROVIDERS.has(row.provider_key);
                return (
                  <div key={row.provider_key} className="admin-card p-4" style={{ border: '1px solid var(--gray-line)', borderRadius: '0.75rem' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{PROVIDER_LABELS[row.provider_key] ?? row.provider_key}</span>
                        {isFree ? (
                          <span className="rounded-sm bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                            free · no key
                          </span>
                        ) : row.requires_key && (
                          <span
                            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                              row.has_api_key ? 'bg-up text-white' : 'bg-gray-bg text-gray-mid'
                            }`}
                          >
                            {row.has_api_key ? 'configured' : 'not set'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(row)}
                        className="min-h-[40px] rounded-md px-3 py-2 font-mono text-xs font-semibold transition-colors"
                        style={
                          row.is_enabled
                            ? { background: 'color-mix(in srgb, var(--up) 18%, transparent)', color: 'var(--up)', border: '1px solid color-mix(in srgb, var(--up) 40%, transparent)' }
                            : { background: 'transparent', color: 'var(--gray-mid)', border: '1px solid var(--gray-line)' }
                        }
                      >
                        {row.is_enabled ? '● enabled' : '○ disabled'}
                      </button>
                    </div>

                    {(row.requires_key || input.apiKey || input.apiSecret) && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="password"
                          placeholder="New API key"
                          value={input.apiKey}
                          onChange={(e) => setKeyInput(row.provider_key, { apiKey: e.target.value })}
                          className="admin-input flex-1"
                        />
                        {row.provider_key === 'alpaca' && (
                          <input
                            type="password"
                            placeholder="API secret"
                            value={input.apiSecret}
                            onChange={(e) => setKeyInput(row.provider_key, { apiSecret: e.target.value })}
                            className="admin-input flex-1"
                          />
                        )}
                        {!isFree && (
                          <button
                            onClick={() => handleSaveKey(row)}
                            disabled={input.saving}
                            className="btn-primary shrink-0"
                          >
                            {input.saving ? 'Saving…' : 'Save key'}
                          </button>
                        )}
                      </div>
                    )}
                    {input.error && <p className="mt-2 text-sm text-down">{input.error}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      {!loading && items.length === 0 && <p className="text-sm text-gray-mid">No providers configured.</p>}
    </section>
  );
}