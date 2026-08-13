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
  twelvedata: 'Twelve Data (forex)',
  fcs: 'FCS API (forex fallback)',
  alpaca: 'Alpaca (stock)',
  coingecko: 'CoinGecko (crypto)',
  goldapi: 'Gold-API (commodity)',
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

  async function handleToggle(row: ProviderConfigRow) {
    const nextEnabled = !row.is_enabled;
    setItems((prev) =>
      prev.map((item) => (item.provider_key === row.provider_key ? { ...item, is_enabled: nextEnabled } : item))
    );
    const res = await fetch(`/api/admin/market-data/providers/${row.provider_key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: nextEnabled }),
    });
    if (!res.ok) {
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
    } catch {
      setKeyInput(row.provider_key, { saving: false, error: 'Save failed. Try again.' });
    }
  }

  return (
    <section className="mb-8 p-4 sm:p-6 border rounded-sm">
      <h2 className="mb-4 text-lg font-bold">Provider Settings</h2>
      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((row) => {
            const input = getKeyInput(row.provider_key);
            return (
              <div key={row.provider_key} className="border border-gray-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-medium">{PROVIDER_LABELS[row.provider_key] ?? row.provider_key}</span>
                    {row.requires_key && (
                      <span
                        className={`ml-2 rounded-sm px-2 py-0.5 text-xs font-medium ${
                          row.has_api_key ? 'bg-up text-white' : 'bg-gray-bg text-gray-mid'
                        }`}
                      >
                        {row.has_api_key ? 'configured' : 'not set'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(row)}
                    className={`min-h-[44px] rounded-sm px-3 py-2 font-mono text-xs ${
                      row.is_enabled ? 'bg-up text-white' : 'bg-gray-bg'
                    }`}
                  >
                    {row.is_enabled ? 'enabled' : 'disabled'}
                  </button>
                </div>

                {row.requires_key && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="password"
                      placeholder="New API key"
                      value={input.apiKey}
                      onChange={(e) => setKeyInput(row.provider_key, { apiKey: e.target.value })}
                      className="min-h-[44px] flex-1 border border-gray-line px-3 py-2 text-sm"
                    />
                    {row.provider_key === 'alpaca' && (
                      <input
                        type="password"
                        placeholder="API secret"
                        value={input.apiSecret}
                        onChange={(e) => setKeyInput(row.provider_key, { apiSecret: e.target.value })}
                        className="min-h-[44px] flex-1 border border-gray-line px-3 py-2 text-sm"
                      />
                    )}
                    <button
                      onClick={() => handleSaveKey(row)}
                      disabled={input.saving}
                      className="min-h-[44px] shrink-0 rounded-sm bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {input.saving ? 'Saving…' : 'Save key'}
                    </button>
                  </div>
                )}
                {input.error && <p className="mt-2 text-sm text-down">{input.error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
