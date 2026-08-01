'use client';

import { use, useEffect, useState } from 'react';
import PostForm from '@/components/admin/PostForm';
import type { Post } from '@/lib/types';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/posts/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Post) => setPost(data))
      .catch(() => setError('Post not found'));
  }, [id]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Edit post</h1>
      {error && <div className="p-3 bg-red text-white rounded text-sm">{error}</div>}
      {!error && !post && <p className="text-sm text-gray-mid">Loading...</p>}
      {post && <PostForm postId={post.id} initialPost={post} />}
    </div>
  );
}
