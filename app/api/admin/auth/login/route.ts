import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { verifyLogin, generateToken } from '@/lib/auth';
import { recordLoginFailure, clearLoginFailures } from '@/lib/security/loginGuard';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function loginHandler(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = await verifyLogin(username, password);

  if (!result.success) {
    await recordLoginFailure(ip, username);
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  await clearLoginFailures(ip);

  const token = generateToken(result.user!);
  const response = NextResponse.json({
    success: true,
    user: {
      id: result.user!.id,
      username: result.user!.username,
      role: result.user!.role,
    },
  });

  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}

export const POST = withApiHandler('admin-auth-login', loginHandler);
