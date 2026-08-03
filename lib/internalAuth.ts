import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { HttpError } from './httpError';

/**
 * Guard cho cac endpoint noi bo goi boi cron VPS (khong dung admin cookie auth).
 * So sanh constant-time de tranh timing attack do them secret.
 */
export function requireInternalSecret(req: NextRequest): void {
  const expected = process.env.MARKET_DATA_CRON_SECRET;
  if (!expected) {
    throw new HttpError(500, 'MARKET_DATA_CRON_SECRET is not configured');
  }

  const provided = req.headers.get('x-internal-secret') ?? '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const isValid =
    expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!isValid) {
    throw new HttpError(401, 'Invalid internal secret');
  }
}
