import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { HttpError } from '@/lib/httpError';
import { uploadMediaToR2 } from '@/lib/r2';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_SIZE = 10 * 1024 * 1024;

async function postHandler(req: NextRequest) {
  await requireAdmin(['superadmin', 'editor', 'author']);

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    throw new HttpError(400, 'Missing file');
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new HttpError(400, 'Unsupported image type — use JPEG, PNG, WebP, or GIF');
  }

  if (file.size > MAX_SIZE) {
    throw new HttpError(413, 'Image too large (max 10MB)');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `posts/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const url = await uploadMediaToR2(key, buffer, file.type);

  return NextResponse.json({ url }, { status: 201 });
}

export const POST = withApiHandler('admin-upload', postHandler);
