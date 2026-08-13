'use client';

import { useEffect, useState } from 'react';
import type { PostTranslation } from '@/lib/types';
import Input from '@/components/ui/Input';
import RichTextEditor from '@/components/admin/RichTextEditor';

interface TranslationFormValues {
  title: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_desc: string;
}

function toFormValues(translation: PostTranslation): TranslationFormValues {
  return {
    title: translation.title,
    excerpt: translation.excerpt ?? '',
    content: translation.content,
    seo_title: translation.seo_title ?? '',
    seo_desc: translation.seo_desc ?? '',
  };
}

export default function PostTranslationPanel({
  postId,
  locale,
}: {
  postId: number;
  locale: string;
}) {
  const [translation, setTranslation] = useState<PostTranslation | null>(null);
  const [values, setValues] = useState<TranslationFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/posts/${postId}/translations/${locale}`)
      .then(async (res) => {
        if (res.status === 404) {
          setTranslation(null);
          setValues(null);
          return;
        }
        if (!res.ok) throw new Error();
        const data: PostTranslation = await res.json();
        setTranslation(data);
        setValues(toFormValues(data));
      })
      .catch(() => setError('Failed to load translation'))
      .finally(() => setLoading(false));
  }, [postId, locale]);

  function update<K extends keyof TranslationFormValues>(key: K, value: TranslationFormValues[K]) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleAiTranslate() {
    setError('');
    setAiLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/translations/${locale}/ai`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'AI translation failed');
        return;
      }
      const data: PostTranslation = await res.json();
      setTranslation(data);
      setValues(toFormValues(data));
    } catch {
      setError('Network connection error');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave(status: 'draft' | 'published') {
    if (!values) return;
    setError('');
    setSaving(status);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/translations/${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          excerpt: values.excerpt || null,
          content: values.content,
          seo_title: values.seo_title || null,
          seo_desc: values.seo_desc || null,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save translation');
        return;
      }
      setTranslation((prev) => (prev ? { ...prev, ...values, status } : prev));
    } catch {
      setError('Network connection error');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-6">Loading translation...</div>;
  }

  if (!translation || !values) {
    return (
      <div className="space-y-4 py-6">
        {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}
        <p className="text-sm text-gray-500">No translation yet for this locale.</p>
        <button
          type="button"
          onClick={handleAiTranslate}
          disabled={aiLoading}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {aiLoading ? 'Translating...' : 'Translate with AI'}
        </button>
      </div>
    );
  }

  const busy = saving !== null || aiLoading;

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {translation.status === 'published' ? 'Published' : 'Draft'} · source: {translation.source}
        </span>
        <button
          type="button"
          onClick={handleAiTranslate}
          disabled={busy}
          className="text-sm min-h-[44px] px-4 py-2 border border-gray-line rounded-sm hover:bg-gray-bg disabled:opacity-50"
        >
          {aiLoading ? 'Translating...' : 'Re-translate with AI'}
        </button>
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Title</label>
        <Input
          type="text"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full"
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Excerpt</label>
        <textarea
          value={values.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-line rounded-sm"
          disabled={busy}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Content</label>
        <RichTextEditor value={values.content} onChange={(html) => update('content', html)} disabled={busy} />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Title</label>
        <Input
          type="text"
          value={values.seo_title}
          onChange={(e) => update('seo_title', e.target.value)}
          className="w-full"
          disabled={busy}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Description</label>
        <textarea
          value={values.seo_desc}
          onChange={(e) => update('seo_desc', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-line rounded-sm"
          disabled={busy}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={busy}
          className="min-h-[44px] px-6 py-2 border border-gray-line rounded-sm hover:bg-gray-bg disabled:opacity-50"
        >
          {saving === 'draft' ? 'Saving...' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('published')}
          disabled={busy}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {saving === 'published' ? 'Publishing...' : 'Publish translation'}
        </button>
      </div>
    </div>
  );
}
