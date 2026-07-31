import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';

async function logoutHandler(_req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}

export const POST = withApiHandler('admin-auth-logout', logoutHandler);
