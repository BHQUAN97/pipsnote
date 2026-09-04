'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BACKGROUND_PRESETS } from '@/lib/backgroundPresets';

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
  'layout.site_name': 'TopTrendMarkets',
  'bg.global': '',
  'bg.hero': '',
  'bg.ticker': '',
  'bg.newsletter': '',
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

const BG_SECTIONS = [
  { key: 'bg.global', label: 'Toàn site' },
  { key: 'bg.hero', label: 'Hero (trang chủ)' },
  { key: 'bg.ticker', label: 'Ticker strip' },
  { key: 'bg.newsletter', label: 'Newsletter' },
];

const TABS = [
  { key: 'presets', label: 'Presets' },
  { key: 'colors', label: 'Theme Colors' },
  { key: 'layout', label: 'Layout' },
  { key: 'backgrounds', label: 'Ảnh nền' },
  { key: 'ai-translation', label: 'AI Dịch' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabKey>('presets');

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

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const handleBgUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'backgrounds');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
        return;
      }
      setKey(key, data.url);
    } catch {
      setUploadError('Network error while uploading');
    } finally {
      setUploadingKey(null);
    }
  };

  // Field ảnh dùng chung (Logo / Favicon / OG) — upload file thay vì gõ URL
  const PicField = ({
    key,
    label,
    helper,
  }: {
    key: string;
    label: string;
    helper: string;
  }) => (
    <div>
      <label className="block text-sm mb-2">{label}</label>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {settings[key] ? (
          <div className="relative h-16 w-28 overflow-hidden rounded-sm border bg-gray-bg">
            <Image src={settings[key]} alt="" fill className="object-contain" />
          </div>
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-sm border text-xs text-gray-mid">
            Chưa có
          </div>
        )}
        <button
          type="button"
          onClick={() => setKey(key, '')}
          disabled={!settings[key] || uploadingKey !== null}
          className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg disabled:opacity-50"
        >
          Xoá ảnh
        </button>
        <label className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg cursor-pointer flex items-center">
          {uploadingKey === key ? 'Đang tải...' : 'Tải ảnh lên'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploadingKey !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleBgUpload(key, file);
            }}
          />
        </label>
        {settings[key] && (
          <input
            type="text"
            value={settings[key]}
            onChange={(e) => setKey(key, e.target.value)}
            className="min-h-[44px] flex-1 min-w-[180px] px-3 py-2 border rounded-sm text-xs font-mono"
            aria-label={`${label} URL`}
          />
        )}
      </div>
      {uploadError && uploadError && <p className="mb-2 text-sm text-down">{uploadError}</p>}
      <p className="mt-1 text-xs opacity-60">{helper}</p>
    </div>
  );

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

      {/* Tab nav — horizontally scrollable trên mobile, tránh 1 trang cuộn dài khi có nhiều nhóm setting */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-mid hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'presets' && (
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
      )}

      {activeTab === 'colors' && (
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
      )}

      {activeTab === 'layout' && (
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
                placeholder="TopTrendMarkets"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-2">Site URL</label>
                            <input
                              type="text"
                              value={settings['site_url'] ?? ''}
                              onChange={(e) => setKey('site_url', e.target.value)}
                              className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
                              placeholder="https://toptrendmarkets.com"
                              maxLength={200}
                            />
                            <p className="mt-1 text-xs opacity-60">
                                                            Dùng cho robots.txt, sitemap, canonical, metadataBase.
                                                          </p>
                                                        </div>
                                                        <div>
                                                          <label className="block text-sm mb-2">Contact email</label>
                                                          <input
                                                            type="email"
                                                            value={settings['footer.contact_email'] ?? ''}
                                                            onChange={(e) => setKey('footer.contact_email', e.target.value)}
                                                            className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
                                                            placeholder="hello@toptrendmarkets.com"
                                                            maxLength={200}
                                                          />
                                                          <p className="mt-1 text-xs opacity-60">
                                                            Hiển thị ở footer và trang liên hệ.
                                                          </p>
                                                        </div>
                                                        <div>
                                                          <PicField
                                                            key="seo.logo_image"
                                                            label="Logo (ảnh tiêu đề)"
                                                            helper="Logo hiển thị ở header thay cho tên chữ. Rỗng = dùng tên chữ."
                                                          />
                                                        </div>
                                                        <div>
                                                          <PicField
                                                            key="seo.favicon"
                                                            label="Favicon"
                                                            helper="Icon tab trình duyệt. Rỗng = dùng app/favicon.ico mặc định."
                                                          />
                                                        </div>
                                                        <div>
                                                          <PicField
                                                            key="seo.og_image"
                                                            label="Ảnh chia sẻ (OG Image)"
                                                            helper="Preview khi chia sẻ link (Telegram/Facebook/Twitter). Rỗng = /og.png mặc định."
                                                          />
                                                        </div>
                                                      </div>
                                                      <div className="mt-4 border-t pt-4">
                                                        <h3 className="mb-2 font-semibold">Market data (tự cập nhật)</h3>
                                                        <div className="space-y-3">
                                                          <div>
                                                            <label className="block text-sm mb-2">Chu kỳ refresh (phút)</label>
                                                            <input
                                                              type="number"
                                                              min={1}
                                                              max={1440}
                                                              value={settings['market.refresh_interval_minutes'] ?? '15'}
                                                              onChange={(e) => setKey('market.refresh_interval_minutes', e.target.value)}
                                                              className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
                                                            />
                                                            <p className="mt-1 text-xs opacity-60">
                                                              Bao lâu lấy giá mới một lần (1–1440). Thay đổi có hiệu lực chu kỳ sau, không cần restart.
                                                            </p>
                                                          </div>
                                                          <div>
                                                            <label className="block text-sm mb-2">Giữ lịch sử giá (ngày)</label>
                                                            <input
                                                              type="number"
                                                              min={1}
                                                              max={365}
                                                              value={settings['market.history_retention_days'] ?? '30'}
                                                              onChange={(e) => setKey('market.history_retention_days', e.target.value)}
                                                              className="w-full min-h-[44px] px-4 py-2 border rounded-sm"
                                                            />
                                                            <p className="mt-1 text-xs opacity-60">
                                                              Dữ liệu cũ ngoài số ngày này sẽ bị dọn. Dữ liệu lịch sử dùng để vẽ biểu đồ thời gian.
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                    </section>
      )}

      {activeTab === 'backgrounds' && (
        <section className="mb-8 p-4 sm:p-6 border rounded-sm">
          <h2 className="text-xl font-semibold mb-4">Ảnh nền</h2>
          {uploadError && <p className="mb-4 text-sm text-down">{uploadError}</p>}
          <div className="space-y-8">
            {BG_SECTIONS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {settings[key] ? (
                    <div className="relative h-16 w-28 overflow-hidden rounded-sm border">
                      <Image src={settings[key]} alt="" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-sm border text-xs text-gray-mid">
                      Không có
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setKey(key, '')}
                    disabled={!settings[key]}
                    className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg disabled:opacity-50"
                  >
                    Xoá ảnh
                  </button>
                  <label className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg cursor-pointer flex items-center">
                    {uploadingKey === key ? 'Đang tải...' : 'Tải ảnh lên'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingKey !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) handleBgUpload(key, file);
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setKey(key, preset.url)}
                      title={preset.label}
                      className={`relative h-14 w-24 overflow-hidden rounded-sm border-2 ${
                        settings[key] === preset.url ? 'border-brand' : 'border-transparent'
                      }`}
                    >
                      <Image src={preset.url} alt={preset.label} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'ai-translation' && (
        <section className="mb-8 p-4 sm:p-6 border rounded-sm">
          <h2 className="text-xl font-semibold mb-1">Cấu hình AI Dịch</h2>
          <p className="text-sm text-gray-mid mb-5">
            Nhà cung cấp, API key, model và system prompt cho tính năng dịch bài đa ngôn ngữ.
            Được lưu vào database (không bị ghi đè khi deploy).
          </p>

          <div className="space-y-5 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-2">Nhà cung cấp (Provider)</label>
              <select
                value={settings.ai_translate_provider || 'openrouter'}
                onChange={(e) => setKey('ai_translate_provider', e.target.value)}
                className="admin-input"
              >
                <option value="openrouter">OpenRouter (Gemini/DeepSeek/GPT…)</option>
                <option value="gemini">Google Gemini (gần nhất)</option>
                <option value="openai">OpenAI</option>
                <option value="custom">Tùy chỉnh (OpenAI-compatible)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={settings.ai_translate_api_key || ''}
                onChange={(e) => setKey('ai_translate_api_key', e.target.value)}
                placeholder="sk-... / AIza... / key OpenRouter"
                className="admin-input"
              />
              <p className="mt-1 text-xs text-gray-mid">
                Lưu trong DB. Có thể dùng key OpenRouter hoặc Google Gemini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <input
                type="text"
                value={settings.ai_translate_model || ''}
                onChange={(e) => setKey('ai_translate_model', e.target.value)}
                placeholder="vd: google/gemini-3.7-flash, gpt-4o-mini, gemini-2.0-flash"
                className="admin-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Base URL (để trống nếu dùng preset)</label>
              <input
                type="text"
                value={settings.ai_translate_base_url || ''}
                onChange={(e) => setKey('ai_translate_base_url', e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="admin-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">System Prompt (điều chỉnh cách dịch)</label>
              <textarea
                value={settings.ai_translate_prompt || ''}
                onChange={(e) => setKey('ai_translate_prompt', e.target.value)}
                rows={5}
                className="admin-input"
                placeholder="Bạn là biên dịch viên chuyên nghiệp về forex/crypto. Dịch sang {language}…"
              />
              <p className="mt-1 text-xs text-gray-mid">
                Dùng placeholder <code>{'{language}'}</code> cho tên ngôn ngữ. Để trống để dùng mặc định.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Save Button — luôn hiện bất kể tab nào đang mở, vì settings là 1 state chung */}
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
