import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { reindexAllPosts } from '@/lib/meilisearch';

async function postHandler() {
  await requireAdmin(['superadmin']);
  const reindexed = await reindexAllPosts();
  return NextResponse.json({ reindexed });
}

export const POST = withApiHandler('admin-search-reindex', postHandler);
