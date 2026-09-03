import { Link } from '@/i18n/navigation';
import type { Category, Post } from '@/lib/types';
import CategoryFilter from './CategoryFilter';
import SearchBox from './SearchBox';
import PostCard from './PostCard';

export default function BlogListView({
  eyebrow,
  title,
  categories,
  posts,
  emptyMessage,
  currentPage,
  totalPages,
  pageHref,
}: {
  eyebrow: string;
  title: string;
  categories: Category[];
  posts: Post[];
  emptyMessage: string;
  currentPage: number;
  totalPages: number;
  pageHref: (p: number) => string;
}) {
  return (
    <section className="py-16 md:py-[72px]">
      <div className="mx-auto max-w-[1180px] px-7">
        <span className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">
          <span className="h-px w-8 bg-brand/70" />
          {eyebrow}
        </span>
        <h1 className="mt-2 mb-9 text-h2 md:text-h2-lg">{title}</h1>

        <SearchBox />
        <CategoryFilter categories={categories} />

        {posts.length === 0 ? (
          <p className="text-sm text-gray-mid">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-11 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                className={`flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-all duration-150 ${
                  p === currentPage
                    ? 'glow-brand border-surface-dark bg-surface-dark text-white'
                    : 'border-gray-line text-gray-mid hover:-translate-y-0.5 hover:border-ink hover:text-ink'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
