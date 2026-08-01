'use client';

import { useState, useEffect } from 'react';

type Settings = Record<string, string>;

const DEFAULT_SETTINGS: Settings = {
  'theme.bg': '#ffffff',
  'theme.ink': '#0a0a0a',
  'theme.surface_dark': '#0a0a0a',
  'theme.red': '#e10600',
  'theme.red_dark': '#b00500',
  'theme.gray_bg': '#f5f4f1',
  'theme.gray_line': '#e4e2dc',
  'theme.gray_mid': '#6e6c66',
  'theme.up': '#1a9e46',
  'theme.down': '#e10600',
  'theme.dark_default': 'false',
  'layout.show_ticker': 'true',
  'layout.hero_variant': 'editorial',
  'layout.site_name': 'PIPSNOTE',
};

const COLOR_KEYS = [
  'theme.bg',
  'theme.ink',
  'theme.surface_dark',
  'theme.red',
  'theme.red_dark',
  'theme.gray_bg',
  'theme.gray_line',
  'theme.gray_mid',
  'theme.up',
  'theme.down',
];

const HERO_VARIANTS = ['editorial', 'ticker-hero', 'grid'];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setMessage('Failed to load settings or not authenticated');
        setLoading(false);
      });
  }, []);

  const setKey = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  const handlePreset = async (preset: string) => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });

      if (!res.ok) throw new Error('Preset failed');
      const data = await res.json();
      setSettings((s) => ({ ...s, ...data.settings }));
      setMessage(`✓ Applied ${preset} preset. Refresh page to see changes.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setMessage('Failed to apply preset');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Save failed');
      setMessage('✓ Settings saved. Refresh page to see changes.');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Site Settings</h1>

      {message && (
          <div className="mb-4 p-4 border rounded-sm bg-gray-bg">
            {message}
          </div>
        )}

        {/* Presets */}
        <section className="mb-8 p-4 sm:p-6 border rounded-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Presets</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handlePreset('red')}
              disabled={saving}
              className="min-h-[44px] px-6 py-3 border-2 border-red rounded-sm hover:bg-red/10 disabled:opacity-50"
            >
              🔴 Editorial Red (Default)
            </button>
            <button
              onClick={() => handlePreset('blue')}
              disabled={saving}
              className="min-h-[44px] px-6 py-3 border-2 border-blue-600 rounded-sm hover:bg-blue-600/10 disabled:opacity-50"
            >
              🔵 Fintech Blue
            </button>
            <button
              onClick={() => handlePreset('neon')}
              disabled={saving}
              className="min-h-[44px] px-6 py-3 border-2 border-green-500 rounded-sm hover:bg-green-500/10 disabled:opacity-50"
            >
              💚 Crypto Neon
            </button>
          </div>
        </section>

        {/* Theme Colors */}
        <section className="mb-8 p-4 sm:p-6 border rounded-sm">
          <h2 className="text-xl font-semibold mb-4">Theme Colors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {COLOR_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-sm mb-2">{key.replace('theme.', '')}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings[key] ?? '#000000'}
                    onChange={(e) => setKey(key, e.target.value)}
                    className="w-16 h-11 border rounded-sm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings[key] ?? ''}
                    onChange={(e) => setKey(key, e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 border rounded-sm text-sm font-mono"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-4 min-h-[44px]">
            <input
              type="checkbox"
              checked={settings['theme.dark_default'] === 'true'}
              onChange={(e) => setKey('theme.dark_default', e.target.checked ? 'true' : 'false')}
              className="w-5 h-5"
            />
            <span>Default dark mode for new visitors (no localStorage yet)</span>
          </label>
        </section>

        {/* Layout Options */}
        <section className="mb-8 p-4 sm:p-6 border rounded-sm">
          <h2 className="text-xl font-semibold mb-4">Layout Options</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={settings['layout.show_ticker'] === 'true'}
                onChange={(e) =>
                  setKey('layout.show_ticker', e.target.checked ? 'true' : 'false')
                }
                className="w-5 h-5"
              />
              <span>Show ticker strip</span>
            </label>
            <div>
              <label className="block text-sm mb-2">Hero variant</label>
              <select
                value={settings['layout.hero_variant'] ?? 'editorial'}
                onChange={(e) => setKey('layout.hero_variant', e.target.value)}
                className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
              >
                {HERO_VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Site name</label>
              <input
                type="text"
                value={settings['layout.site_name'] ?? ''}
                onChange={(e) => setKey('layout.site_name', e.target.value)}
                className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
                placeholder="PIPSNOTE"
                maxLength={100}
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] px-8 py-3 bg-brand text-white rounded-sm hover:bg-brand-dark disabled:opacity-50 font-semibold"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-6 py-3 border rounded-sm hover:bg-gray-bg"
          >
            Reset
          </button>
        </div>

      <p className="mt-4 text-sm text-gray-mid">
        💡 Changes apply immediately after save + page refresh. Settings stored in database.
      </p>
    </div>
  );
}
