import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './lib/security/rateLimiter';
import { isIpBlocked } from './lib/security/loginGuard';

export async function proxy(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') ||
             req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'unknown';

  const pathname = req.nextUrl.pathname;

  // 1. Check IP block (login guard)
  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Try again later.' },
      { status: 403 }
    );
  }

  // 2. Rate limit check (admin routes only)
  if (pathname.startsWith('/api/admin')) {
    const { allowed, remaining } = await checkRateLimit(ip, pathname);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'Retry-After': '60',
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
