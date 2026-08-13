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

  return (
    <div className="max-w-3xl">
      {postId && TRANSLATION_LOCALES.length > 0 && (
        <div className="flex gap-2 border-b border-gray-line mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('original')}
            className={`min-h-[44px] px-4 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'original'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Original
          </button>
          {TRANSLATION_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveTab(locale)}
              className={`min-h-[44px] px-4 text-sm font-medium border-b-2 -mb-px uppercase ${
                activeTab === locale
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {locale}
            </button>
          ))}
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
          className="w-full px-4 py-2 border border-gray-line rounded-sm"
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
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded-sm"
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
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded-sm"
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
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save post'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          disabled={saving}
          className="min-h-[44px] px-6 py-2 border border-gray-line rounded-sm hover:bg-gray-bg disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
      )}
    </div>
  );
}
