import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withApiHandler } from '@/lib/withApiHandler';
import { HttpError } from '@/lib/httpError';
import type { RowDataPacket } from 'mysql2';

interface BrokerRow extends RowDataPacket {
  id: number;
  affiliate_url: string | null;
}

async function goHandler(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/go\/([^/]+)/);
  const slug = match ? decodeURIComponent(match[1]) : '';

  if (!slug) {
    throw new HttpError(404, 'Broker not found');
  }

  const brokers = await query<BrokerRow[]>(
    'SELECT id, affiliate_url FROM brokers WHERE slug = ? AND is_active = 1 LIMIT 1',
    [slug]
  );
  const broker = brokers[0];

  if (!broker || !broker.affiliate_url) {
    throw new HttpError(404, 'Broker not found');
  }

  const postIdParam = req.nextUrl.searchParams.get('post');
  const postId = postIdParam && /^\d+$/.test(postIdParam) ? Number(postIdParam) : null;

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const userAgent = req.headers.get('user-agent');
  const referrer = req.headers.get('referer');

  await query(
    `INSERT INTO affiliate_clicks (broker_id, post_id, ip_hash, user_agent, referrer)
     VALUES (?, ?, ?, ?, ?)`,
    [broker.id, postId, ipHash, userAgent, referrer]
  );
  await query('UPDATE brokers SET click_count = click_count + 1 WHERE id = ?', [broker.id]);

  return NextResponse.redirect(broker.affiliate_url, 307);
}

export const GET = withApiHandler('affiliate-redirect', goHandler);
