'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    bg: '#ffffff',
    ink: '#1a1a1a',
    surfaceDark: '#1a1a1a',
    brand: '#dc2626',
    brandDark: '#991b1b',
    accent: '#3b82f6',
    accentDark: '#1e40af',
    up: '#10b981',
    down: '#dc2626',
    neutral: '#6b7280',
    red: '#dc2626',
    redDark: '#991b1b',
    headerSticky: true,
    showDarkModeToggle: true,
    footerText: '',
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setMessage('Failed to load settings or not authenticated');
        setLoading(false);
      });
  }, []);

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

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-bg">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Site Settings</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm border rounded hover:bg-neutral/10"
          >
            Logout
          </button>
        </div>

        {message && (
          <div className="mb-4 p-4 border rounded bg-neutral/10">
            {message}
          </div>
        )}

        {/* Presets */}
        <section className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Presets</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handlePreset('red')}
              disabled={saving}
              className="px-6 py-3 border-2 border-red rounded hover:bg-red/10 disabled:opacity-50"
            >
              🔴 Editorial Red (Default)
            </button>
            <button
              onClick={() => handlePreset('blue')}
              disabled={saving}
              className="px-6 py-3 border-2 border-blue-600 rounded hover:bg-blue-600/10 disabled:opacity-50"
            >
              🔵 Fintech Blue
            </button>
            <button
              onClick={() => handlePreset('neon')}
              disabled={saving}
              className="px-6 py-3 border-2 border-green-500 rounded hover:bg-green-500/10 disabled:opacity-50"
            >
              💚 Crypto Neon
            </button>
          </div>
        </section>

        {/* Theme Colors */}
        <section className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Theme Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['bg', 'ink', 'surfaceDark', 'brand', 'brandDark', 'accent', 'accentDark', 'up', 'down', 'neutral', 'red', 'redDark'].map(key => (
              <div key={key}>
                <label className="block text-sm mb-2 capitalize">{key}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings[key as keyof typeof settings] as string}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    className="w-16 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings[key as keyof typeof settings] as string}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Layout Options */}
        <section className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Layout Options</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.headerSticky}
                onChange={(e) => setSettings({ ...settings, headerSticky: e.target.checked })}
                className="w-5 h-5"
              />
              <span>Sticky header</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showDarkModeToggle}
                onChange={(e) => setSettings({ ...settings, showDarkModeToggle: e.target.checked })}
                className="w-5 h-5"
              />
              <span>Show dark mode toggle</span>
            </label>
            <div>
              <label className="block text-sm mb-2">Footer Text (optional)</label>
              <input
                type="text"
                value={settings.footerText}
                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                placeholder="© 2026 PIPSNOTE. All rights reserved."
                maxLength={500}
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 font-semibold"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 border rounded hover:bg-neutral/10"
          >
            Reset
          </button>
        </div>

        <p className="mt-4 text-sm text-neutral">
          💡 Changes apply immediately after save + page refresh. Settings stored in database.
        </p>
      </div>
    </div>
  );
}
