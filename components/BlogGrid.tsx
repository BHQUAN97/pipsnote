import { getPublishedPosts } from '@/lib/posts';
import PostCard from './PostCard';

export default async function BlogGrid({
  limit = 6,
  categorySlug,
}: {
  limit?: number;
  categorySlug?: string;
}) {
  const { items: posts } = await getPublishedPosts({ categorySlug, limit });

  if (posts.length === 0) {
    return <p className="text-sm text-gray-mid">No posts yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
