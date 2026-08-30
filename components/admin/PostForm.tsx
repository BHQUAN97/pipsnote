'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Post } from '@/lib/types';
import Input from '@/components/ui/Input';
import RichTextEditor from '@/components/admin/RichTextEditor';
import TagInput from '@/components/admin/TagInput';
import PostTranslationPanel from '@/components/admin/PostTranslationPanel';
import { slugify } from '@/lib/slugify';
import { routing } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';

const LOCALE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt', en: 'English', de: 'Deutsch', fr: 'Français',
  es: 'Español', it: 'Italiano', pt: 'Português', ru: 'Русский',
  pl: 'Polski', ja: '日本語',
};

const TRANSLATION_LOCALES = routing.locales.filter((l) => l !== routing.defaultLocale);

interface TagOption {
  id: number;
  name: string;
  slug: string;
}

interface PostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category_id: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  read_time: string;
  seo_title: string;
  seo_desc: string;
  tags: TagOption[];
}

function toFormValues(post?: Post | null): PostFormValues {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    featured_image: post?.featured_image ?? '',
    category_id: post?.category_id != null ? String(post.category_id) : '',
    status: post?.status ?? 'draft',
    is_featured: Boolean(post?.is_featured),
    read_time: post?.read_time != null ? String(post.read_time) : '',
    seo_title: post?.seo_title ?? '',
    seo_desc: post?.seo_desc ?? '',
    tags: post?.tags ?? [],
  };
}

export default function PostForm({ postId, initialPost }: { postId?: number; initialPost?: Post }) {
  const router = useRouter();
  const [values, setValues] = useState<PostFormValues>(() => toFormValues(initialPost));
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | string>('original');
  const [translateAllLoading, setTranslateAllLoading] = useState(false);
  const [translateAllMsg, setTranslateAllMsg] = useState('');
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);

  const toggleLocaleMenu = () => setLocaleMenuOpen((o) => !o);
  const localeLabel = (locale: string) => LOCALE_LABELS[locale] || locale;

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  function update<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt || null,
      content: values.content,
      featured_image: values.featured_image || null,
      category_id: values.category_id ? Number(values.category_id) : null,
      status: values.status,
      is_featured: values.is_featured,
      read_time: values.read_time ? Number(values.read_time) : null,
      seo_title: values.seo_title || null,
      seo_desc: values.seo_desc || null,
      tag_ids: values.tags.map((tag) => tag.id),
    };

    try {
      const res = await fetch(postId ? `/api/admin/posts/${postId}` : '/api/admin/posts', {
        method: postId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save post');
        return;
      }

      router.push('/admin/posts');
    } catch {
      setError('Network connection error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTranslateAll() {
    if (!postId) return;
    setTranslateAllLoading(true);
    setTranslateAllMsg('');
    const results: string[] = [];
    let failed = 0;
    for (const locale of TRANSLATION_LOCALES) {
      try {
        const res = await fetch(`/api/admin/posts/${postId}/translations/${locale}/ai`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          failed++;
          results.push(`${locale}: ${data.error || 'lỗi'}`);
        } else {
          results.push(`${locale}: ✓`);
        }
      } catch {
        failed++;
        results.push(`${locale}: lỗi kết nối`);
      }
    }
    setTranslateAllMsg(`Đã dịch ${TRANSLATION_LOCALES.length - failed}/${TRANSLATION_LOCALES.length} ngôn ngữ. ${results.join(' · ')}`);
    setTranslateAllLoading(false);
  }

  return (
    <div className="max-w-3xl">
      {postId && TRANSLATION_LOCALES.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-line mb-5 pb-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'original'
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:bg-gray-bg'
              }`}
            >
              Bản gốc
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={toggleLocaleMenu}
              className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                activeTab !== 'original'
                  ? 'border-brand text-brand'
                  : 'border-gray-line text-gray-600 hover:bg-gray-bg'
              }`}
            >
              <span>{activeTab !== 'original' ? localeLabel(activeTab) : 'Ngôn ngữ…'}</span>
              <ChevronDown size={14} />
            </button>
            {localeMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-gray-line bg-bg py-1 shadow-elevated-static">
                {TRANSLATION_LOCALES.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => { setActiveTab(locale); setLocaleMenuOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-bg ${
                      activeTab === locale ? 'font-semibold text-brand' : 'text-gray-600'
                    }`}
                  >
                    <span>{localeLabel(locale)}</span>
                    <span className="font-mono text-xs text-gray-400">{locale}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTranslateAll}
            disabled={translateAllLoading}
            className="ml-auto flex h-9 items-center gap-2 rounded-md border border-brand/40 px-4 text-xs font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
          >
            {translateAllLoading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                Đang dịch…
              </>
            ) : (
              <>✨ Dịch tất cả bằng AI</>
            )}
          </button>
        </div>
      )}

      {translateAllMsg && (
        <div className="mb-4 rounded-md border border-brand/30 bg-brand/10 px-4 py-2 text-sm text-ink">
          {translateAllMsg}
        </div>
      )}

      {activeTab !== 'original' && postId ? (
        <PostTranslationPanel key={activeTab} postId={postId} locale={activeTab} />
      ) : (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}

      <div>
        <label className="block text-sm mb-2 font-medium">Title</label>
        <Input
          type="text"
          value={values.title}
          onChange={(e) => {
            update('title', e.target.value);
            if (!slugTouched) update('slug', slugify(e.target.value));
          }}
          className="w-full"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Slug</label>
        <Input
          type="text"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update('slug', e.target.value);
          }}
          pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
          className="w-full font-mono"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Excerpt</label>
        <textarea
          value={values.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          rows={3}
          className="admin-input"
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Content</label>
        <RichTextEditor value={values.content} onChange={(html) => update('content', html)} disabled={saving} />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Featured image (URL)</label>
        <Input
          type="text"
          value={values.featured_image}
          onChange={(e) => update('featured_image', e.target.value)}
          className="w-full"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 font-medium">Category</label>
          <select
            value={values.category_id}
            onChange={(e) => update('category_id', e.target.value)}
            className="admin-input"
            disabled={saving}
          >
            <option value="">— None —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Status</label>
          <select
            value={values.status}
            onChange={(e) => update('status', e.target.value as PostFormValues['status'])}
            className="admin-input"
            disabled={saving}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Read time (min)</label>
          <Input
            type="number"
            min={0}
            value={values.read_time}
            onChange={(e) => update('read_time', e.target.value)}
            className="w-full"
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2 mt-7">
          <input
            id="is_featured"
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => update('is_featured', e.target.checked)}
            className="h-5 w-5"
            disabled={saving}
          />
          <label htmlFor="is_featured" className="text-sm font-medium">
            Featured post
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Tags</label>
        <TagInput value={values.tags} onChange={(tags) => update('tags', tags)} disabled={saving} />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Title</label>
        <Input
          type="text"
          value={values.seo_title}
          onChange={(e) => update('seo_title', e.target.value)}
          className="w-full"
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Description</label>
        <textarea
          value={values.seo_desc}
          onChange={(e) => update('seo_desc', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-line rounded-sm"
          disabled={saving}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save post'}
        </button>
        <button type="button" onClick={() => router.push('/admin/posts')} disabled={saving} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
      )}
    </div>
  );
}
