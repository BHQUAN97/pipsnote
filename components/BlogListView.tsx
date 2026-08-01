import Link from 'next/link';
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
        <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">
          {eyebrow}
        </span>
        <h1 className="mt-1 mb-9 text-[26px] md:text-[30px]">{title}</h1>

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
                className={`flex h-11 min-w-11 items-center justify-center border px-3 text-sm font-medium ${
                  p === currentPage
                    ? 'border-surface-dark bg-surface-dark text-white'
                    : 'border-gray-line'
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
