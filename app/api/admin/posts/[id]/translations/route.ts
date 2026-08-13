import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { HttpError } from '@/lib/httpError';
import { getPostTranslations } from '@/lib/postTranslations';

function extractPostId(req: NextRequest): number {
  const match = req.nextUrl.pathname.match(/^\/api\/admin\/posts\/(\d+)\/translations/);
  if (!match) {
    throw new HttpError(400, 'Invalid post id');
  }
  return Number(match[1]);
}

async function getHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);
  const postId = extractPostId(req);

  const translations = await getPostTranslations(postId);
  return NextResponse.json({ translations });
}

export const GET = withApiHandler('admin-post-translations-get', getHandler);
