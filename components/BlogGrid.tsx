import { query } from '@/lib/db';
import type { Post } from '@/lib/types';
import PostCard from './PostCard';

export default async function BlogGrid({
  limit = 6,
  categorySlug,
}: {
  limit?: number;
  categorySlug?: string;
}) {
  const where = categorySlug
    ? 'WHERE p.status = "published" AND c.slug = ?'
    : 'WHERE p.status = "published"';
  const params = categorySlug ? [categorySlug, limit] : [limit];

  const posts = await query<Post[]>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.is_featured DESC, p.published_at DESC
     LIMIT ?`,
    params
  );

  if (posts.length === 0) {
    return <p className="text-sm text-gray-mid">Chưa có bài viết nào.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
