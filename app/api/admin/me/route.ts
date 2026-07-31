import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { getAdminUser } from '@/lib/getAdminUser';

async function meHandler() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(user);
}

export const GET = withApiHandler('admin-me', meHandler);
