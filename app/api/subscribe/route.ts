import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { query } from '@/lib/db';

const SubscribeSchema = z.object({
  email: z.string().email().max(255),
  source: z.string().max(100).optional(),
});

async function subscribeHandler(req: NextRequest) {
  const body = await req.json();
  const parsed = SubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email, source } = parsed.data;

  await query(
    `INSERT INTO subscribers (email, status, source) VALUES (?, 'active', ?)
     ON DUPLICATE KEY UPDATE status = 'active'`,
    [email, source ?? null]
  );

  return NextResponse.json({ success: true });
}

export const POST = withApiHandler('subscribe', subscribeHandler);
