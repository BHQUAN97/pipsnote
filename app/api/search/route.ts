import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { searchPosts } from '@/lib/meilisearch';

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  cat: z.string().max(60).nullable().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});

export const dynamic = 'force-dynamic';

async function getHandler(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const parsed = SearchQuerySchema.safeParse({
    q: params.get('q'),
    cat: params.get('cat'),
    page: params.get('page') ?? undefined,
    pageSize: params.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search query', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { q, cat, page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  const { items, total } = await searchPosts(q, {
    categorySlug: cat ?? null,
    limit: pageSize,
    offset,
  });

  return NextResponse.json({ items, total, page, pageSize });
}

export const GET = withApiHandler('search', getHandler);
