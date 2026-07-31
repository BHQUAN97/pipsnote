'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Broker } from '@/lib/types';

interface BrokerFormValues {
  name: string;
  slug: string;
  type: 'forex' | 'crypto' | 'stock' | 'all';
  logo_url: string;
  description: string;
  badge: string;
  min_deposit: string;
  leverage: string;
  spread_from: string;
  affiliate_url: string;
  rating: string;
  is_active: boolean;
  is_featured: boolean;
}

function toFormValues(broker?: Broker | null): BrokerFormValues {
  return {
    name: broker?.name ?? '',
    slug: broker?.slug ?? '',
    type: broker?.type ?? 'forex',
    logo_url: broker?.logo_url ?? '',
    description: broker?.description ?? '',
    badge: broker?.badge ?? '',
    min_deposit: broker?.min_deposit ?? '',
    leverage: broker?.leverage ?? '',
    spread_from: broker?.spread_from ?? '',
    affiliate_url: broker?.affiliate_url ?? '',
    rating: broker?.rating != null ? String(broker.rating) : '',
    is_active: broker ? Boolean(broker.is_active) : true,
    is_featured: broker ? Boolean(broker.is_featured) : false,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BrokerForm({ brokerId, initialBroker }: { brokerId?: number; initialBroker?: Broker }) {
  const router = useRouter();
  const [values, setValues] = useState<BrokerFormValues>(() => toFormValues(initialBroker));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialBroker));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof BrokerFormValues>(key: K, value: BrokerFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      name: values.name,
      slug: values.slug,
      type: values.type,
      logo_url: values.logo_url || null,
      description: values.description || null,
      badge: values.badge || null,
      min_deposit: values.min_deposit || null,
      leverage: values.leverage || null,
      spread_from: values.spread_from || null,
      affiliate_url: values.affiliate_url || null,
      rating: values.rating ? Number(values.rating) : null,
      is_active: values.is_active,
      is_featured: values.is_featured,
    };

    try {
      const res = await fetch(brokerId ? `/api/admin/brokers/${brokerId}` : '/api/admin/brokers', {
        method: brokerId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Lưu broker thất bại');
        return;
      }

      router.push('/admin/brokers');
    } catch {
      setError('Lỗi kết nối mạng');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && <div className="p-3 bg-red text-white rounded text-sm">{error}</div>}

      <div>
        <label className="block text-sm mb-2 font-medium">Tên broker</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => {
            update('name', e.target.value);
            if (!slugTouched) update('slug', slugify(e.target.value));
          }}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Slug</label>
        <input
          type="text"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update('slug', e.target.value);
          }}
          pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded font-mono text-sm"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Mô tả</label>
        <textarea
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Logo (URL)</label>
        <input
          type="text"
          value={values.logo_url}
          onChange={(e) => update('logo_url', e.target.value)}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 font-medium">Loại</label>
          <select
            value={values.type}
            onChange={(e) => update('type', e.target.value as BrokerFormValues['type'])}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          >
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="stock">Stock</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Badge</label>
          <input
            type="text"
            value={values.badge}
            onChange={(e) => update('badge', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Nạp tối thiểu</label>
          <input
            type="text"
            value={values.min_deposit}
            onChange={(e) => update('min_deposit', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Đòn bẩy</label>
          <input
            type="text"
            value={values.leverage}
            onChange={(e) => update('leverage', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Spread từ</label>
          <input
            type="text"
            value={values.spread_from}
            onChange={(e) => update('spread_from', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Đánh giá (0-5)</label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={values.rating}
            onChange={(e) => update('rating', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Affiliate URL</label>
        <input
          type="text"
          value={values.affiliate_url}
          onChange={(e) => update('affiliate_url', e.target.value)}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => update('is_active', e.target.checked)}
            className="h-5 w-5"
            disabled={saving}
          />
          <label htmlFor="is_active" className="text-sm font-medium">
            Đang hoạt động
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_featured"
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => update('is_featured', e.target.checked)}
            className="h-5 w-5"
            disabled={saving}
          />
          <label htmlFor="is_featured" className="text-sm font-medium">
            Nổi bật
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu broker'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/brokers')}
          disabled={saving}
          className="min-h-[44px] px-6 py-2 border border-gray-line rounded hover:bg-gray-bg disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
