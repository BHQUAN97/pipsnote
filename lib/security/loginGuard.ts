// Login protection: track failures, block IP after threshold (Redis-backed, per docs/SECURITY_DETECTION.md)
import { getRedis } from '../redis';
import { persistLog } from '../logSink';

const MAX_FAILS = 10;
const LOCK_WINDOW_SEC = 600; // đếm trong 10 phút
const BLOCK_TTL_SEC = 3600; // block 1h — khớp bantime của fail2ban jail

export async function recordLoginFailure(ip: string, username?: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // Không có Redis → fail-open, không track được failure

  try {
    const key = `login-fail:${ip}`;
    const fails = await redis.incr(key);
    if (fails === 1) await redis.expire(key, LOCK_WINDOW_SEC);

    if (fails >= MAX_FAILS) {
      await redis.set(`blocked_ips:${ip}`, '1', 'EX', BLOCK_TTL_SEC);

      await persistLog({
        level: 'error',
        module: 'security.login-guard',
        message: `IP ${ip} bị auto-block sau ${fails} lần đăng nhập sai (username: ${username ?? 'unknown'})`,
        metadata: { ip, username, fails },
      });

      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `[pipsnote] Auto-blocked IP ${ip} — ${fails} login fails` }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('recordLoginFailure failed:', err);
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false; // fail-open

  try {
    return (await redis.exists(`blocked_ips:${ip}`)) === 1;
  } catch (err) {
    console.error('isIpBlocked check failed:', err);
    return false;
  }
}

export async function clearLoginFailures(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(`login-fail:${ip}`);
  } catch (err) {
    console.error('clearLoginFailures failed:', err);
  }
}
